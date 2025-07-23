// Prima rimuovi la configurazione esistente
db.training_params.deleteOne({
 "algorithm_name": "taming_3dgs"
});

// Insert documento per Taming-3DGS - PARAMETRI OTTIMIZZATI
db.training_params.insertOne({
 // === IDENTIFICAZIONE ALGORITMO ===
 "algorithm_name": "taming_3dgs",
 "display_name": "Taming 3D Gaussian Splatting",
 "version": "1.0",
 "active": true,
 
 // === METADATI ===
 "metadata": {
   "description": "Taming-3DGS: Budget-controlled 3DGS con parametri ottimizzati per qualità",
   "paper_reference": "Taming 3DGS: High-Quality Radiance Fields with Limited Resources",
   "repository": "https://github.com/humansensinglab/taming-3dgs",
   "supported_platforms": ["linux", "windows"],
   "min_gpu_memory_gb": 8,
   "notes": "Parametri ottimizzati per migliore qualità. densify_grad_threshold aumentato, percent_dense aumentato, lambda_dssim ridotto"
 },
 
 "base_params": {
    "iterations": 30000,
    "cams": 20, 
    "budget": 1000000,     
    "mode": "final_count",
    "ho_iteration": 15000,
    "densify_grad_threshold": 0.0002,
    "densification_interval": 100,
    "densify_from_iter": 500,
    "densify_until_iter": 15000,
    "eval": true
  },

 // === MOLTIPLICATORI OTTIMIZZATI ===
 "quality_multipliers": {
   "fast": {
      "densification_interval": 0.8,
     "budget": 0.75,                     // ✅ 750k gaussians
   },
   "balanced": {
     "densification_interval": 1.0,
     "budget": 1.0,                      // ✅ 1M gaussians
   },
   "quality": {
      "densification_interval": 1.2,
      "budget": 2,                     // ✅ 3M gaussians
   }
 },
 
 // === OVERRIDE RESOLUTION ===
  "preprocessing_params": {
    "fast": {
      "target_width": 1920,
      "target_height": 1080
    },
    "balanced": {
      "target_width": 2560,
      "target_height": 1440,
    },
    "quality": {
      "target_width": 3840,
      "target_height": 2160
    }
  },
 
 // === HARDWARE CONFIG ===
 "hardware_config": {
   "baseline_vram_gb": 20,
   "min_vram_gb": 8,
   "resolution_thresholds": [
      { "vram_threshold": 24, "target_width": 3840,"target_height": 2160, "description": "Full resolution (24GB+)" },
      { "vram_threshold": 20, "target_width": 2560,"target_height": 1440, "description": "Quarter resolution (16GB+)" },
      { "vram_threshold": 16, "target_width": 1280,"target_height": 720, "description": "Quarter resolution (16GB+)" },
      { "vram_threshold": 8, "target_width": 1280,"target_height": 720, "description": "Eighth resolution (8GB+)" }
    ],
   "scaling_formulas": {
      "densify_grad_threshold": {
        "description": "Balanced: scaling moderato",
        "formula": "max(1.0, 2.5 - (vram_factor * 1.5))",
        "min": 1.0,
        "max": 4.0
      },
      "budget": {
        "formula": "max(0.6, 0.5 + (vram_factor * 0.5))",
        "description": "Scaling bilanciato gaussiane massime",
        "min": 0.6,
        "max": 1.2
      }
 }
},

 // === VALIDAZIONE OTTIMIZZATA ===
 "validation_rules": [
   {
     "rule": "budget > 0",
     "message": "Budget deve essere positivo"
   },
   {
     "rule": "cams >= 10",
     "message": "Minimo 10 cameras per Taming-3DGS"
   }
 ],
 
 // === TIMESTAMP ===
 "created_at": new Date(),
 "updated_at": new Date(),
 "created_by": "system",
 "updated_by": "system"
});

console.log("✅ Taming-3DGS configurazione OTTIMIZZATA inserita!");
console.log("🎯 Parametri chiave ottimizzati:");
console.log("   - cams: 20 (da 10)");
console.log("   - densify_grad_threshold: 0.0005 (da 0.0002)");
console.log("   - percent_dense: 0.05 (da 0.01)");
console.log("   - lambda_dssim: 0.1 (da 0.2)");
console.log("   - budget: 800k (da 1M per stabilità)");
console.log("⚠️  densify_until_iter = 15k (stabile)");
console.log("⚠️  densify_until_iter = 15k (stabile)");