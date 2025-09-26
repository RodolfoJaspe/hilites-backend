const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

const router = express.Router();

// Sign up
router.post('/signup', validateRequest(schemas.signup), async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || ''
        }
      }
    });

    if (error) {
      return res.status(400).json({
        error: 'Signup failed',
        message: error.message
      });
    }

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || ''
      },
      session: data.session
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during signup'
    });
  }
});

// Sign in
router.post('/signin', validateRequest(schemas.signin), async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        error: 'Signin failed',
        message: error.message
      });
    }

    res.json({
      message: 'Signin successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || ''
      },
      session: data.session
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during signin'
    });
  }
});

// Sign out
router.post('/signout', authenticateUser, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({
        error: 'Signout failed',
        message: error.message
      });
    }

    res.json({
      message: 'Signout successful'
    });
  } catch (error) {
    console.error('Signout error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during signout'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { full_name } = req.body;
    const user = req.user;

    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: full_name || user.user_metadata?.full_name || ''
      }
    });

    if (error) {
      return res.status(400).json({
        error: 'Profile update failed',
        message: error.message
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || ''
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while updating profile'
    });
  }
});

module.exports = router;
