import os
from PIL import Image


is_train = 0
if is_train:
  intermediate = "train"
else:
  intermediate = "test"


def rename_files():
  directory = os.listdir(f"mindmaps/{intermediate}/temp")
  num_file = 1
  for file_name in directory:
    if file_name.endswith("jpg") or file_name.endswith("png"):
      new_file_name = f"{num_file}.{file_name.split('.')[-1]}"
      old_file_path = f"mindmaps/{intermediate}/temp/{file_name}"
      new_file_path = f"mindmaps/{intermediate}/data/{new_file_name}"
      os.rename(old_file_path, new_file_path)
      num_file += 1

def compress_files():
  # https://github.com/TannerGilbert
  directory = os.listdir(f"mindmaps/{intermediate}/data")
  size = (400, 600)
  for img in directory:
    im = Image.open(f"mindmaps/{intermediate}/data/{img}")
    im_resized = im.resize(size, Image.ANTIALIAS)
    im_resized.save(f"mindmaps/{intermediate}/data/{img}")


# main
# rename_files()
# compress_files()