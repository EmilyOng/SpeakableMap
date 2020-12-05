# Dataset

https://www.mindtools.com/media/Diagrams/MindMaps_Figure3.png

https://i.pinimg.com/originals/0c/a7/36/0ca73645f1e17777832d0b9d17e224d9.png

https://thesweetsetup.com/wp-content/uploads/2018/03/4-basicmindmap.jpg

https://d2slcw3kip6qmk.cloudfront.net/marketing/pages/chart/examples/brainstorming-map.svg

https://d3n817fwly711g.cloudfront.net/uploads/2012/08/Mind-map-example-How-To-Defeat-Superman-1280x720.png

https://www.canr.msu.edu/contentAsset/image/8c122bc7-efa6-4dcd-a92a-7d83d2106c39/fileAsset/filter/Resize,Jpeg/resize_w/750/jpeg_q/80

https://www.abeuk.com/sites/default/files/styles/full_width/public/files/BF3MM.png?itok=arBNCUUW

https://simon513313.files.wordpress.com/2014/11/shapes-large.jpg

https://d2slcw3kip6qmk.cloudfront.net/marketing/pages/chart/examples/health-mind-map.svg

https://d2slcw3kip6qmk.cloudfront.net/marketing/pages/chart/examples/physics-mind-map.png


## Training
```bash
python3 model_main_tf2.py --model_dir=models/faster_rcnn_inception_resnet_v2_1024x1024_coco17_tpu-8 --pipeline_config_path=models/faster_rcnn_inception_resnet_v2_1024x1024_coco17_tpu-8/pipeline.config
```

## Evaluation
```bash
python3 model_main_tf2.py --model_dir=models/faster_rcnn_inception_resnet_v2_1024x1024_coco17_tpu-8 --pipeline_config_path=models/faster_rcnn_inception_resnet_v2_1024x1024_coco17_tpu-8/pipeline.config --checkpoint_dir=models/faster_rcnn_inception_resnet_v2_1024x1024_coco17_tpu-8 
```

## Exporting
```bash
python3 exporter_main_v2.py \
    --input_type image_tensor \
    --pipeline_config_path models/faster_rcnn_inception_resnet_v2_1024x1024_coco17_tpu-8/pipeline.config \
    --trained_checkpoint_dir models/faster_rcnn_inception_resnet_v2_1024x1024_coco17_tpu-8 \
    --output_directory exported-models/faster_rcnn_inception_resnet_v2_1024x1024_coco17_tpu-8
```

## Flask
https://flask.palletsprojects.com/en/1.1.x/installation/
```bash
. venv/bin/activate
```