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
 
 // === PARAMETRI ESSENZIALI OTTIMIZZATI ===
 "base_params": {
   "iterations": 30000,
   "cams": 15,                           // ✅ AUMENTATO da 10 a 20
   "budget": 1500000,                     // ✅ RIDOTTO da 1M a 800k per stabilità
   "mode": "final_count",
   "ho_iteration": 17000,
   "test_iterations": -1,
   
   // === PARAMETRI DENSIFICATION OTTIMIZZATI ===
   "densify_from_iter": 500,
   "densify_until_iter": 15000,
   "densification_interval": 100,
   "densify_grad_threshold": 0.0002,     // ✅ AUMENTATO da 0.0002 a 0.0005
   "percent_dense": 0.01,                // ✅ AUMENTATO da 0.01 a 0.05
   
   // === PARAMETRI LEARNING RATE ===
   "opacity_lr":0.025,
   "scaling_lr": 0.005,
   "rotation_lr": 0.001,
   "position_lr_init": 0.00016,
   "position_lr_delay_mult": 0.01,
   
   // === PARAMETRI LOSS OTTIMIZZATI ===
   "lambda_dssim": 0.2,                  // ✅ RIDOTTO da 0.2 a 0.1
   "sh_degree": 3,
   
   "eval": true
 },
 
 // === MOLTIPLICATORI OTTIMIZZATI ===
 "quality_multipliers": {
   "draft": {
     "cams": 0.5,                        // ✅ 10 cameras per draft
     "iterations": 1.0,
     "budget": 0.60,                     // ✅ 480k gaussians
     "test_iterations": 1.0,
     "densify_from_iter": 1.0,
     "densify_grad_threshold": 1.2,      // ✅ Soglia più permissiva per draft
     "percent_dense": 0.8                // ✅ Meno denso per draft
   },
   "standard": {
     "cams": 1.0,                        // ✅ 20 cameras
     "iterations": 1.0,
     "budget": 1.0,                      // ✅ 800k gaussians
     "test_iterations": 1.0,
     "densify_from_iter": 1.0,
     "densify_grad_threshold": 1.0,
     "percent_dense": 1.0
   },
   "high": {
     "cams": 1.5,                        // ✅ 30 cameras
     "iterations": 1.0,
     "budget": 1.25,                     // ✅ 1M gaussians
     "test_iterations": 1.0,
     "densify_from_iter": 1.0,
     "densify_grad_threshold": 0.8,      // ✅ Soglia più stringente per high
     "percent_dense": 1.2
   },
   "ultra": {
     "cams": 2.0,                        // ✅ 40 cameras
     "iterations": 1.0,
     "budget": 1.50,                     // ✅ 1.2M gaussians
     "test_iterations": 1.0,
     "densify_from_iter": 1.0,
     "densify_grad_threshold": 0.6,      // ✅ Soglia ancora più stringente
     "percent_dense": 1.4
   }
 },
 
 // === OVERRIDE RESOLUTION ===
 "quality_overrides": {
   "draft": {
     "resolution": -1
   },
   "standard": {
     "resolution": 1
   },
   "high": {
     "resolution": 1
   },
   "ultra": {
     "resolution": 1
   }
 },
 
 // === HARDWARE CONFIG ===
 "hardware_config": {
   "baseline_vram_gb": 20,
   "min_vram_gb": 8,
   "resolution_thresholds": [
     { "vram_threshold": 20, "resolution": 1, "description": "Full resolution" },
     { "vram_threshold": 8, "resolution": 4, "description": "Quarter resolution" }
   ],
   "scaling_formulas": {
     // ❌ RIMOSSO: scaling per densification (causa IndexError)
   }
 },
 
 // === NESSUN POST CALCULATION ===
 "post_calculation": {},
 
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