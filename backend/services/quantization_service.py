from typing import Dict, Any
from pathlib import Path
from models.schemas import QuantizationResult, QuantizationMethod
from utils.logger import get_logger
from utils.security import safe_child_path
from config import settings

logger = get_logger(__name__)


class QuantizationService:
    def __init__(self):
        self.models_dir = Path(settings.models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)
    
    async def quantize_model(
        self,
        model_path: str,
        method: QuantizationMethod,
        bits: int = 4
    ) -> QuantizationResult:
        logger.info(f"Starting quantization: {model_path} with {method} at {bits}-bit")
        
        try:
            model_dir = safe_child_path(self.models_dir, model_path)
            if not model_dir.exists():
                raise ValueError(f"Model path does not exist: {model_path}")
            
            original_size_mb = self._calculate_directory_size(model_dir)
            
            output_dir = safe_child_path(
                model_dir.parent,
                f"{model_dir.name}_quantized_{method.value}_{bits}bit",
            )
            output_dir.mkdir(parents=True, exist_ok=True)
            
            if method == QuantizationMethod.BITS_4 or method == QuantizationMethod.BITS_8:
                quantized_size_mb = await self._quantize_bitsandbytes(
                    model_path, str(output_dir), bits
                )
            elif method == QuantizationMethod.GPTQ:
                quantized_size_mb = await self._quantize_gptq(
                    model_path, str(output_dir), bits
                )
            elif method == QuantizationMethod.GGUF:
                quantized_size_mb = await self._quantize_gguf(
                    model_path, str(output_dir), bits
                )
            else:
                raise ValueError(f"Unsupported quantization method: {method}")
            
            compression_ratio = original_size_mb / quantized_size_mb if quantized_size_mb > 0 else 1.0
            
            estimated_speedup = self._estimate_speedup(method, bits)
            estimated_memory_reduction = 1.0 - (quantized_size_mb / original_size_mb)
            
            result = QuantizationResult(
                original_size_mb=round(original_size_mb, 2),
                quantized_size_mb=round(quantized_size_mb, 2),
                compression_ratio=round(compression_ratio, 2),
                method=method.value,
                bits=bits,
                output_path=str(output_dir),
                estimated_speedup=estimated_speedup,
                estimated_memory_reduction=round(estimated_memory_reduction, 2)
            )
            
            logger.info(f"Quantization completed: {compression_ratio:.2f}x compression")
            return result
            
        except Exception as e:
            logger.error(f"Quantization failed: {e}")
            raise Exception(f"Quantization error: {str(e)}")
    
    async def _quantize_bitsandbytes(
        self,
        model_path: str,
        output_path: str,
        bits: int
    ) -> float:
        logger.info(f"Quantizing with bitsandbytes {bits}-bit")
        
        """
        from transformers import AutoModelForCausalLM, BitsAndBytesConfig
        import torch
        
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=(bits == 4),
            load_in_8bit=(bits == 8),
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True
        )
        
        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            quantization_config=quantization_config,
            device_map="auto"
        )
        
        model.save_pretrained(output_path)
        """
        
        # Simulate quantization result
        import asyncio
        await asyncio.sleep(1)  # Simulate processing
        
        original_size = self._calculate_directory_size(Path(model_path))
        if bits == 4:
            quantized_size = original_size * 0.25
        else:
            quantized_size = original_size * 0.5
        
        return quantized_size
    
    async def _quantize_gptq(
        self,
        model_path: str,
        output_path: str,
        bits: int
    ) -> float:
        """Quantize using GPTQ.
        
        Args:
            model_path: Input model path
            output_path: Output path
            bits: Quantization bits
            
        Returns:
            Quantized model size in MB
        """
        logger.info(f"Quantizing with GPTQ {bits}-bit")
        
        # In production, use actual GPTQ quantization
        """
        from auto_gptq import AutoGPTQForCausalLM, BaseQuantizeConfig
        
        quantize_config = BaseQuantizeConfig(
            bits=bits,
            group_size=128,
            desc_act=False,
            sym=True,
            true_sequential=True
        )
        
        model = AutoGPTQForCausalLM.from_pretrained(
            model_path,
            quantize_config=quantize_config
        )
        
        # Prepare calibration data
        model.quantize(calibration_dataset)
        
        model.save_quantized(output_path)
        """
        
        # Simulate
        import asyncio
        await asyncio.sleep(2)  # GPTQ takes longer
        
        original_size = self._calculate_directory_size(Path(model_path))
        if bits == 4:
            quantized_size = original_size * 0.27
        else:
            quantized_size = original_size * 0.52
        
        return quantized_size
    
    async def _quantize_gguf(
        self,
        model_path: str,
        output_path: str,
        bits: int
    ) -> float:
        """Quantize to GGUF format (for llama.cpp).
        
        Args:
            model_path: Input model path
            output_path: Output path
            bits: Quantization bits
            
        Returns:
            Quantized model size in MB
        """
        logger.info(f"Quantizing to GGUF {bits}-bit")
        
        # In production, convert to GGUF format
        """
        # This typically involves:
        # 1. Convert to GGUF format using convert.py from llama.cpp
        # 2. Quantize using quantize tool from llama.cpp
        
        import subprocess
        
        # Convert to GGUF
        subprocess.run([
            "python", "convert.py",
            model_path,
            "--outfile", f"{output_path}/model.gguf",
            "--outtype", "f16"
        ])
        
        # Quantize
        quant_type = "Q4_K_M" if bits == 4 else "Q8_0"
        subprocess.run([
            "./quantize",
            f"{output_path}/model.gguf",
            f"{output_path}/model-{quant_type}.gguf",
            quant_type
        ])
        """
        
        # Simulate
        import asyncio
        await asyncio.sleep(1.5)
        
        original_size = self._calculate_directory_size(Path(model_path))
        if bits == 4:
            quantized_size = original_size * 0.3
        else:
            quantized_size = original_size * 0.55
        
        return quantized_size
    
    def _calculate_directory_size(self, directory: Path) -> float:
        total_size = 0
        
        if directory.is_file():
            return directory.stat().st_size / (1024 * 1024)
        
        for file in directory.rglob('*'):
            if file.is_file():
                total_size += file.stat().st_size
        
        return total_size / (1024 * 1024)
    
    def _estimate_speedup(self, method: QuantizationMethod, bits: int) -> float:
        speedup_map = {
            (QuantizationMethod.BITS_4, 4): 1.8,
            (QuantizationMethod.BITS_8, 8): 1.4,
            (QuantizationMethod.GPTQ, 4): 2.0,
            (QuantizationMethod.GPTQ, 8): 1.5,
            (QuantizationMethod.GGUF, 4): 2.2,
            (QuantizationMethod.GGUF, 8): 1.6,
        }
        
        return speedup_map.get((method, bits), 1.0)
    
    async def compare_quantization_methods(
        self,
        model_path: str
    ) -> Dict[str, Any]:
        logger.info(f"Comparing quantization methods for: {model_path}")
        
        original_size = self._calculate_directory_size(Path(model_path))
        
        comparisons = {}
        
        methods = [
            (QuantizationMethod.BITS_4, 4),
            (QuantizationMethod.BITS_8, 8),
            (QuantizationMethod.GPTQ, 4),
            (QuantizationMethod.GGUF, 4)
        ]
        
        for method, bits in methods:
            speedup = self._estimate_speedup(method, bits)
            
            if bits == 4:
                size_factor = 0.25 if method == QuantizationMethod.BITS_4 else 0.27 if method == QuantizationMethod.GPTQ else 0.3
            else:
                size_factor = 0.5 if method == QuantizationMethod.BITS_8 else 0.52
            
            quantized_size = original_size * size_factor
            
            comparisons[f"{method.value}_{bits}bit"] = {
                "method": method.value,
                "bits": bits,
                "original_size_mb": round(original_size, 2),
                "quantized_size_mb": round(quantized_size, 2),
                "compression_ratio": round(original_size / quantized_size, 2),
                "estimated_speedup": speedup,
                "memory_reduction_pct": round((1 - size_factor) * 100, 1),
                "recommended_use_case": self._get_use_case_recommendation(method, bits)
            }
        
        return {
            "original_size_mb": round(original_size, 2),
            "comparisons": comparisons,
            "recommendation": self._get_best_recommendation(comparisons)
        }
    
    def _get_use_case_recommendation(self, method: QuantizationMethod, bits: int) -> str:
        recommendations = {
            (QuantizationMethod.BITS_4, 4): "Best for low-memory GPUs, good quality/size tradeoff",
            (QuantizationMethod.BITS_8, 8): "Better quality, moderate memory savings",
            (QuantizationMethod.GPTQ, 4): "Best speed/quality for GPUs, optimized inference",
            (QuantizationMethod.GGUF, 4): "Best for CPU inference with llama.cpp"
        }
        
        return recommendations.get((method, bits), "General purpose")
    
    def _get_best_recommendation(self, comparisons: Dict[str, Any]) -> str:
        return (
            "For GPU inference: GPTQ 4-bit offers best speed/quality balance. "
            "For CPU inference: GGUF 4-bit with llama.cpp. "
            "For best quality with memory constraints: 8-bit quantization."
        )
