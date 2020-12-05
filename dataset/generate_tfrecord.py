# https://github.com/datitran/raccoon_dataset/blob/master/generate_tfrecord.py

from __future__ import division
from __future__ import print_function
from __future__ import absolute_import

import os
import io
import pandas as pd
import tensorflow as tf

from PIL import Image
from object_detection.utils import dataset_util
from collections import namedtuple, OrderedDict


is_train = 0
if is_train:
  intermediate = "train"
else:
  intermediate = "test"


def class_text_to_int(row_label):
  if row_label == "topic":
    return 1
  elif row_label == "idea":
    return 2
  elif row_label == "arrow":
    return 3
  else:
    return None

def split(df, group):
  data = namedtuple("data", ["filename", "object"])
  gb = df.groupby(group)
  return [data(filename, gb.get_group(x)) for filename, x 
          in zip(gb.groups.keys(), gb.groups)]

def create_tf_example(group, path):
  with tf.io.gfile.GFile(os.path.join(path, "{}".format(group.filename)), "rb") as fid:
      encoded_img = fid.read()
  encoded_img_io = io.BytesIO(encoded_img)
  image = Image.open(encoded_img_io)
  width, height = image.size

  filename = group.filename.encode("utf8")
  image_format = (group.filename.split('.')[-1]).encode("utf-8")
  xmins = []
  xmaxs = []
  ymins = []
  ymaxs = []
  classes_text = []
  classes = []

  for index, row in group.object.iterrows():
      xmins.append(row["xmin"] / width)
      xmaxs.append(row["xmax"] / width)
      ymins.append(row["ymin"] / height)
      ymaxs.append(row["ymax"] / height)
      classes_text.append(row["class"].encode("utf8"))
      classes.append(class_text_to_int(row["class"]))

  tf_example = tf.train.Example(features=tf.train.Features(feature={
      "image/height": dataset_util.int64_feature(height),
      "image/width": dataset_util.int64_feature(width),
      "image/filename": dataset_util.bytes_feature(filename),
      "image/source_id": dataset_util.bytes_feature(filename),
      "image/encoded": dataset_util.bytes_feature(encoded_img),
      "image/format": dataset_util.bytes_feature(image_format),
      "image/object/bbox/xmin": dataset_util.float_list_feature(xmins),
      "image/object/bbox/xmax": dataset_util.float_list_feature(xmaxs),
      "image/object/bbox/ymin": dataset_util.float_list_feature(ymins),
      "image/object/bbox/ymax": dataset_util.float_list_feature(ymaxs),
      "image/object/class/text": dataset_util.bytes_list_feature(classes_text),
      "image/object/class/label": dataset_util.int64_list_feature(classes),
  }))
  return tf_example


def main(_):
  writer = tf.io.TFRecordWriter(f"{intermediate}.record")
  image_path = os.path.join(f"mindmaps/{intermediate}/data")
  examples = pd.read_csv(f"mindmaps/{intermediate}/mindmap_labels.csv")
  grouped = split(examples, "filename")
  for group in grouped:
      tf_example = create_tf_example(group, image_path)
      writer.write(tf_example.SerializeToString())

  writer.close()


if __name__ == "__main__":
  tf.compat.v1.app.run()