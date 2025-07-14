# img_classification/model.py
import onnxruntime as rt
from PIL import Image
import numpy as np

class YOLOv8Model:
    def __init__(self, model_path):
        self.session = rt.InferenceSession(model_path)
        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name

    def preprocess(self, image: Image.Image):
        image = image.resize((640, 640))  # Resize as per model requirements
        image = np.array(image).astype(np.float32)
        image = np.transpose(image, (2, 0, 1))  # Channel first
        image = np.expand_dims(image, axis=0) / 255.0
        return image

    def predict(self, image: Image.Image):
        processed_image = self.preprocess(image)
        outputs = self.session.run([self.output_name], {self.input_name: processed_image})
        return outputs

