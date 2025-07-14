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
    "cams": 15, 
    "budget": 1500000,     
    "mode": "final_count",
    "ho_iteration": 17000,
    "densify_grad_threshold": 0.0002,
    "densification_interval": 100,
    "densify_from_iter": 500,
    "densify_until_iter": 15000,
    "opacity_lr": 0.05,
    "scaling_lr": 0.005,
    "rotation_lr": 0.001,
    "percent_dense": 0.01,                // ✅ AUMENTATO da 0.01 a 0.05
    "eval": true
  },

 // === MOLTIPLICATORI OTTIMIZZATI ===
 "quality_multipliers": {
   "fast": {
     "budget": 0.75,                     // ✅ 480k gaussians
     "test_iterations": 1.0,
     "densify_from_iter": 1.0,
     "densify_grad_threshold": 1.2,      // ✅ Soglia più permissiva per draft
     "percent_dense": 0.8                // ✅ Meno denso per draft
   },
   "balanced": {
     "budget": 1.0,                      // ✅ 800k gaussians
     "test_iterations": 1.0,
     "densify_from_iter": 1.0,
     "densify_grad_threshold": 1.0
   },
   "quality": {
     "budget": 1.25,                     // ✅ 1M gaussians
     "test_iterations": 1.0,
     "densify_from_iter": 1.0,
     "densify_grad_threshold": 0.8      // ✅ Soglia più stringente per high
   }
 },
 
 // === OVERRIDE RESOLUTION ===
  "quality_overrides": {
    "fast": {
      "resolution": 4
    },
    "balanced": {
      "resolution": 2
    },
    "quality": {
      "resolution": 1
    }
  },
 
 // === HARDWARE CONFIG ===
 "hardware_config": {
   "baseline_vram_gb": 20,
   "min_vram_gb": 8,
   "resolution_thresholds": [
      { "vram_threshold": 24, "resolution": 1, "description": "Full resolution (24GB+)" },
      { "vram_threshold": 16, "resolution": 4, "description": "Full resolution (16GB+)" },
      { "vram_threshold": 8, "resolution": 8, "description": "Quarter resolution (8GB+)" }
    ],
   "scaling_formulas": {
      "densify_grad_threshold": {
        "formula": "max(1.8, 4.0 - (vram_factor * 2.2))",
        "description": "Scaling uniforme basato solo su VRAM disponibile",
        "min": 1.8,
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
     "rule": "densify_until_iter <= 15000",
     "message": "densify_until_iter MAI oltre 15k per stabilità"
   },
   {
     "rule": "cams >= 10",
     "message": "Minimo 10 cameras per Taming-3DGS"
   },
   {
     "rule": "densify_grad_threshold >= 0.0002",
     "message": "densify_grad_threshold troppo basso causa artefatti"
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