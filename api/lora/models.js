import { listTrainingModels } from '../lib/trainingModelRegistry.js';

/**
 * List available training models for the frontend model selector.
 * Returns model ID, name, base model, category, pricing, and feature flags.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const category = req.query.category || null;
  const models = listTrainingModels(category);

  const clientModels = models.map(m => ({
    id: m.id,
    name: m.name,
    baseModel: m.baseModel,
    category: m.category,
    pricing: m.pricing,
    pricingNote: m.pricingNote || null,
    supportsStyle: m.supportsStyle,
    supportsMasks: m.supportsMasks,
    defaultSteps: m.defaults.steps,
    stepRange: m.stepRange,
    defaultLearningRate: m.defaults.learning_rate,
  }));

  return res.json({ success: true, models: clientModels });
}
