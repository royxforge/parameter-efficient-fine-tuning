from services.model_analyzer import ModelAnalyzer
from services.hyperparameter_optimizer import HyperparameterOptimizer
from services.dataset_processor import DatasetProcessor
from services.training_service import TrainingService
from services.quantization_service import QuantizationService
from services.code_generator import CodeGenerator

model_analyzer = ModelAnalyzer()
hyperparameter_optimizer = HyperparameterOptimizer()
dataset_processor = DatasetProcessor()
training_service = TrainingService()
quantization_service = QuantizationService()
code_generator = CodeGenerator()