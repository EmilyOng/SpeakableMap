# https://github.com/datitran/raccoon_dataset/blob/master/xml_to_csv.py

import os
import pandas as pd
import xml.etree.ElementTree as ET


is_train = 0
if is_train:
  intermediate = "train"
else:
  intermediate = "test"

def xml_to_csv():
  xml_list = []
  directory = os.listdir(f"mindmaps/{intermediate}/xml")
  for xml_file in directory:
    if xml_file.endswith("xml"):
      tree = ET.parse(f"mindmaps/{intermediate}/xml/{xml_file}")
      root = tree.getroot()
      for member in root.findall("object"):
        value = (root.find("filename").text,
                int(root.find("size")[0].text),
                int(root.find("size")[1].text),
                member[0].text,
                int(member[4][0].text),
                int(member[4][1].text),
                int(member[4][2].text),
                int(member[4][3].text))
        xml_list.append(value)
  column_names = ["filename", "width", "height", "class", 
                  "xmin", "ymin", "xmax", "ymax"]
  xml_df = pd.DataFrame(xml_list, columns=column_names)
  return xml_df

# main
xml_df = xml_to_csv()
xml_df.to_csv(f"mindmaps/{intermediate}/mindmap_labels.csv", index=None)