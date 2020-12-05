import os
import numpy as np
from google.cloud import vision
import cv2
import math
import tensorflow as tf
import io
from PIL import Image
from object_detection.utils import ops as utils_ops
from object_detection.utils import label_map_util
from object_detection.utils import visualization_utils as vis_util


def infer(model, image):
  # https://tensorflow-object-detection-api-tutorial.readthedocs.io/en/latest/training.html#exporting-a-trained-model
  image = np.asarray(image)
  input_tensor = tf.convert_to_tensor(image) # convert to tensor
  input_tensor = input_tensor[tf.newaxis,...]

  output_dict = model(input_tensor)

  num_detections = int(output_dict.pop("num_detections"))
  output_dict = {key:value[0, :num_detections].numpy() 
                for key,value in output_dict.items()}
  output_dict["num_detections"] = num_detections

  output_dict["detection_classes"] = output_dict['detection_classes'].astype(np.int64)

  if "detection_masks" in output_dict:
    detection_masks_reframed = utils_ops.reframe_box_masks_to_image_masks(
                                output_dict["detection_masks"], output_dict["detection_boxes"],
                                image.shape[0], image.shape[1])      
    detection_masks_reframed = tf.cast(detection_masks_reframed > 0.5,
                                        tf.uint8)
    output_dict["detection_masks_reframed"] = detection_masks_reframed.numpy()

  return output_dict


def detect_document(image_file):
  os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = "static/speakable-map.json"
  client = vision.ImageAnnotatorClient()

  image = vision.Image(content=image_file)
  response = client.document_text_detection(image=image)
  text = []
  for page in response.full_text_annotation.pages:
    for block in page.blocks:
      for paragraph in block.paragraphs:
        for word in paragraph.words:
          word_text = ''.join([
              symbol.text for symbol in word.symbols
          ])
          text.append(word_text)
  return text


def return_info(image_path, file_name):
  model = tf.saved_model.load("static/saved_model")
  labels = "static/labelmap.pbtxt"
  category_index = label_map_util.create_category_index_from_labelmap(labels, use_display_name=True)

  image_file = Image.open(image_path).convert("RGB")
  output_bytes = io.BytesIO()
  image_file.save(output_bytes, format="JPEG")
  image_file_string = output_bytes.getvalue()

  img_decoded = tf.image.decode_image(image_file_string, channels=3)
  image_np = img_decoded.numpy()

  output_dict = infer(model, image_np)

  os.mkdir(f"uploads/results/{file_name}")

  vis_util.visualize_boxes_and_labels_on_image_array(
    image_np,
    output_dict["detection_boxes"],
    output_dict["detection_classes"],
    output_dict["detection_scores"],
    category_index,
    instance_masks=output_dict.get("detection_masks_reframed", None),
    use_normalized_coordinates=True,
    line_thickness=8
  )
  
  Image.fromarray(image_np).save(os.path.join("uploads", "results", file_name, f"{file_name}.jpg"))

  size = len(output_dict["detection_boxes"])
  min_score_threshold = 0.2
  image = Image.open(image_path)
  image_width = image.width
  image_height = image.height

  nodes = []
  detected_text = {"file_name": f"{file_name}.jpg"}

  for i in range (size):
    box = output_dict["detection_boxes"][i]
    class_ = output_dict["detection_classes"][i]
    score = output_dict["detection_scores"][i]
    if score > min_score_threshold: # not arrow
      # (left, upper, right, lower)
      ymin, xmin, ymax, xmax = box
      area = (xmin * image_width, ymin * image_height, 
              xmax * image_width, ymax * image_height)
      if class_ != 3:
        cropped_img = image.crop(area).convert("L")
        ret, grayed = cv2.threshold(np.array(cropped_img), 125, 255, cv2.THRESH_BINARY)
        grayed_img = Image.fromarray(grayed.astype(np.uint8))
        buffer = io.BytesIO()
        grayed_img.save(buffer, format="JPEG")
        grayed_img_bytes = buffer.getvalue()                     
        text = " ".join(detect_document(grayed_img_bytes))
        nodes.append([area, int(class_), text])
        if len(text) > 0:
          grayed_img_filepath = os.path.join("results", file_name, f"{str(i)}.jpg")
          grayed_img.save(os.path.join("uploads", grayed_img_filepath))
          detected_text[f"{str(i)}.jpg"] = text
      else:
        nodes.append([area, int(class_), ""])
        
  errors = {}
  for i in range (len(nodes)):
    node_area = nodes[i][0]
    node_class = nodes[i][1]
    # xmin, ymin, xmax, ymax
    source_xmin = node_area[0]
    source_ymin = node_area[1]
    source_xmax = node_area[2]
    source_ymax = node_area[3]
    source_x = source_xmin + (source_xmax - source_xmin) / 2
    source_y = source_ymin + (source_ymax - source_ymin) / 2
    if node_class == 3:
      curr_error = []
      for j in range (len(nodes)):
        if i != j and nodes[j][1] != 3:
          # xmin, ymin, xmax, ymax
          target_xmin = nodes[j][0][0]
          target_ymin = nodes[j][0][1]
          target_xmax = nodes[j][0][2]
          target_ymax = nodes[j][0][3]
          target_x = target_xmin + (target_xmax - target_xmin) / 2
          target_y = target_ymin + (target_ymax - target_ymin) / 2
          if target_y >= source_y:
            if target_x >= source_x:
              error = math.sqrt(math.pow(abs(target_xmin - source_xmax), 2) + 
                      math.pow(abs(target_ymax - source_ymin), 2))
            else:
              error = math.sqrt(math.pow(abs(target_xmax - source_xmin), 2) + 
                      math.pow(abs(target_ymax - source_ymin), 2))
          else:
            if target_x >= source_x:
              error = math.sqrt(math.pow(abs(target_xmin - source_xmax), 2) + 
                      math.pow(abs(target_ymin - source_ymax), 2))
            else:
              error = math.sqrt(math.pow(abs(target_xmax - source_xmin), 2) + 
                      math.pow(abs(target_ymin - source_ymax), 2))
          curr_error.append([error, j])
      curr_error = sorted(curr_error, key=lambda l:l[0])
      errors[str(i)] = curr_error
  return nodes, errors, detected_text

