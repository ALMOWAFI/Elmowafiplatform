import express from 'express';

const router = express.Router();

// POST /api/activities/recommendations
// Query: lat, lon, need, ageGroup, indoor, query
// Body: { visionContext?: { frame: base64 } }
router.post('/activities/recommendations', async (req, res) => {
  try {
    const { lat, lon, need = 'bonding', ageGroup = 'mixed', indoor = 'false', query = '' } = req.query;
    const { visionContext } = req.body || {};

    // Minimal heuristic baseline while AI service is integrated
    const nearby = lat && lon ? 'nearby' : 'home';
    const isIndoor = String(indoor) === 'true';

    // Sample curated responses tuned by need/place
    const catalog = [
      {
        id: 'bonding-1',
        title: isIndoor ? 'Story Circle with Photo Prompts' : 'Park Story Walk',
        description: isIndoor
          ? 'Sit in a circle, show a random family photo, and each person adds one funny sentence to the story.'
          : 'Walk to the nearest green area and build a story together about things you spot (birds, trees, signs).',
        activity_type: 'creative',
        suggested_duration: '20-30 min',
      },
      {
        id: 'kids-energy-1',
        title: isIndoor ? 'Indoor Treasure Clues' : 'Photo Safari Challenge',
        description: isIndoor
          ? 'Hide 5 small items; give rhyming clues. Bonus: use camera to “scan” area for hints.'
          : 'Find 5 things matching prompts (a red sign, something round, a smiling face) and take photos.',
        activity_type: 'challenge',
        suggested_duration: '30-45 min',
      },
      {
        id: 'learning-1',
        title: nearby === 'nearby' ? 'Local Landmark Trivia' : 'Culture Cards',
        description: nearby === 'nearby'
          ? 'Walk to a nearby landmark; ask 3 trivia questions the AI suggests about it.'
          : 'Create 6 culture cards (city, food, tradition). AI suggests prompts; flip and discuss.',
        activity_type: 'outing',
        suggested_duration: '25-35 min',
      },
    ];

    // Filter simple examples using need
    const filterByNeed = (n) => {
      if (need === 'bonding') return n.id.startsWith('bonding');
      if (need === 'kids-energy') return n.id.startsWith('kids-energy');
      if (need === 'learning') return n.id.startsWith('learning');
      return true;
    };

    const recommendations = catalog.filter(filterByNeed);
    return res.json({ recommendations, meta: { lat, lon, need, ageGroup, indoor: isIndoor, usedVision: !!visionContext } });
  } catch (e) {
    return res.status(500).json({ error: 'failed_to_recommend', message: e.message });
  }
});

export default router;


