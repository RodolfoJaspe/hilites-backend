const Joi = require('joi');

// Validation schemas
const schemas = {
  signup: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    full_name: Joi.string().min(2).max(100).optional()
  }),

  signin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  favoriteTeam: Joi.object({
    team_id: Joi.string().uuid().required()
  }),

  favoritePlayer: Joi.object({
    player_id: Joi.string().required(),
    player_name: Joi.string().required(),
    player_image: Joi.string().uri().optional(),
    team_name: Joi.string().optional()
  })
};

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message,
        details: error.details
      });
    }
    
    next();
  };
};

module.exports = {
  schemas,
  validateRequest
};
