const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

// ============ MIDDLEWARE ============
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ============ MONGODB CONNECTION ============
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/webhook-tutorial';
mongoose.connect(mongoUri)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ============ DATABASE SCHEMAS ============

// Store registered webhooks (where to send notifications)
const webhookSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true }, // The URL that will RECEIVE our webhooks
  events: [String], // ['user.created', 'order.completed']
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
const Webhook = mongoose.model('Webhook', webhookSchema);

// Store webhook delivery logs (to see what was sent)
const webhookLogSchema = new mongoose.Schema({
  eventType: String,
  webhookId: mongoose.Schema.Types.ObjectId,
  webhookUrl: String,
  payload: mongoose.Schema.Types.Mixed,
  status: String, // 'success', 'failed', 'pending'
  statusCode: Number,
  response: mongoose.Schema.Types.Mixed,
  error: String,
  sentAt: { type: Date, default: Date.now },
  timestamp: { type: Date, default: Date.now }
});
const WebhookLog = mongoose.model('WebhookLog', webhookLogSchema);

// Store users (example entity that triggers webhooks)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Store orders (another example entity that triggers webhooks)
const orderSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  amount: { type: Number, required: true },
  status: { type: String, default: 'pending' }, // pending, completed, failed
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// ============ HELPER FUNCTION: TRIGGER WEBHOOKS ============
/**
 * This function is called when an event happens
 * It finds all registered webhooks for this event type
 * Then sends POST requests to all of them
 */
async function triggerWebhooks(eventType, eventData) {
  console.log(`\n🚀 WEBHOOK TRIGGERED: ${eventType}`);
  console.log('📦 Payload:', eventData);
  
  // Find all active webhooks subscribed to this event
  const registeredWebhooks = await Webhook.find({
    events: eventType,
    isActive: true
  });

  console.log(`📨 Found ${registeredWebhooks.length} registered webhooks`);

  // Send webhook to each registered URL
  for (const webhook of registeredWebhooks) {
    try {
      console.log(`\n→ Sending to: ${webhook.url}`);
      
      const response = await axios.post(webhook.url, {
        eventType: eventType,
        data: eventData,
        timestamp: new Date().toISOString()
      }, {
        timeout: 5000 // 5 second timeout
      });

      // Log successful delivery
      await WebhookLog.create({
        eventType: eventType,
        webhookId: webhook._id,
        webhookUrl: webhook.url,
        payload: eventData,
        status: 'success',
        statusCode: response.status,
        response: response.data,
        sentAt: new Date()
      });

      console.log(`✅ Webhook delivered successfully! Status: ${response.status}`);
    } catch (error) {
      // Log failed delivery
      await WebhookLog.create({
        eventType: eventType,
        webhookId: webhook._id,
        webhookUrl: webhook.url,
        payload: eventData,
        status: 'failed',
        statusCode: error.response?.status || null,
        error: error.message,
        sentAt: new Date()
      });

      console.log(`❌ Failed to deliver webhook: ${error.message}`);
    }
  }
}

// ============ WEBHOOK REGISTRATION ENDPOINTS ============

/**
 * GET /api/webhooks
 * List all registered webhooks
 */
app.get('/api/webhooks', async (req, res) => {
  try {
    const webhooks = await Webhook.find();
    res.json(webhooks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhooks/register
 * Register a new webhook
 * 
 * Frontend sends:
 * {
 *   "name": "My Service",
 *   "url": "http://localhost:5000/webhook-receiver",
 *   "events": ["user.created", "order.completed"]
 * }
 */
app.post('/api/webhooks/register', async (req, res) => {
  try {
    const { name, url, events } = req.body;

    if (!name || !url || !events || events.length === 0) {
      return res.status(400).json({ 
        error: 'Please provide name, url, and at least one event' 
      });
    }

    const webhook = await Webhook.create({
      name,
      url,
      events,
      isActive: true
    });

    console.log(`✅ Webhook registered: ${name} (${url})`);
    res.status(201).json(webhook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/webhooks/:id
 * Remove a registered webhook
 */
app.delete('/api/webhooks/:id', async (req, res) => {
  try {
    const webhook = await Webhook.findByIdAndDelete(req.params.id);
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    res.json({ message: 'Webhook deleted', webhook });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/webhooks/:id/logs
 * Get delivery logs for a specific webhook
 */
app.get('/api/webhooks/:id/logs', async (req, res) => {
  try {
    const logs = await WebhookLog.find({ webhookId: req.params.id })
      .sort({ sentAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ EVENT TRIGGER ENDPOINTS (Examples) ============

/**
 * POST /api/users
 * Create a user → triggers 'user.created' webhook
 */
app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email required' });
    }

    const user = await User.create({ name, email });

    // 🔔 TRIGGER WEBHOOKS when user is created
    await triggerWebhooks('user.created', {
      userId: user._id,
      name: user.name,
      email: user.email
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orders
 * Create an order → triggers 'order.created' webhook
 */
app.post('/api/orders', async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ error: 'userId and amount required' });
    }

    const order = await Order.create({
      userId,
      amount,
      status: 'pending'
    });

    // 🔔 TRIGGER WEBHOOKS when order is created
    await triggerWebhooks('order.created', {
      orderId: order._id,
      userId: order.userId,
      amount: order.amount,
      status: order.status
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/orders/:id/complete
 * Complete an order → triggers 'order.completed' webhook
 */
app.patch('/api/orders/:id/complete', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'completed' },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // 🔔 TRIGGER WEBHOOKS when order is completed
    await triggerWebhooks('order.completed', {
      orderId: order._id,
      userId: order.userId,
      amount: order.amount,
      status: order.status
    });

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ WEBHOOK RECEIVER (for testing) ============

/**
 * POST /webhook-receiver
 * This is where OUR APP receives webhooks from OTHER services
 * Used for testing - your frontend can register this URL as a webhook
 */
app.post('/webhook-receiver', (req, res) => {
  console.log('\n📬 WEBHOOK RECEIVED at /webhook-receiver');
  console.log('Event:', req.body.eventType);
  console.log('Data:', req.body.data);
  console.log('Time:', req.body.timestamp);

  // Always respond with 200 so the sender knows we got it
  res.status(200).json({ 
    success: true, 
    message: 'Webhook received and processed',
    receivedAt: new Date().toISOString()
  });
});

/**
 * GET /webhook or POST /webhook
 * Frontend registers this URL to receive webhooks
 */
app.get('/webhook', (req, res) => {
  res.json({ message: 'Webhook endpoint ready to receive POST requests' });
});

app.post('/webhook', (req, res) => {
  console.log('\n📬 WEBHOOK RECEIVED at /webhook');
  console.log('Event:', req.body.eventType);
  console.log('Data:', req.body.data);
  console.log('Time:', req.body.timestamp);

  res.status(200).json({ 
    success: true, 
    message: 'Webhook received and processed',
    receivedAt: new Date().toISOString()
  });
});

// ============ DASHBOARD ENDPOINTS ============

/**
 * GET /api/stats
 * Get overall stats for the dashboard
 */
app.get('/api/stats', async (req, res) => {
  try {
    const totalWebhooks = await Webhook.countDocuments();
    const totalLogs = await WebhookLog.countDocuments();
    const successfulDeliveries = await WebhookLog.countDocuments({ status: 'success' });
    const failedDeliveries = await WebhookLog.countDocuments({ status: 'failed' });
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();

    res.json({
      totalWebhooks,
      totalLogs,
      successfulDeliveries,
      failedDeliveries,
      totalUsers,
      totalOrders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/logs
 * Get all webhook delivery logs
 */
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await WebhookLog.find()
      .sort({ sentAt: -1 })
      .limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ START SERVER ============

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 Webhook Server Running on http://localhost:${PORT}`);
  console.log(`${'='.repeat(50)}\n`);
  console.log('📖 API Endpoints:');
  console.log('   POST   /api/webhooks/register - Register a webhook');
  console.log('   GET    /api/webhooks          - List webhooks');
  console.log('   DELETE /api/webhooks/:id      - Remove webhook');
  console.log('   GET    /api/webhooks/:id/logs - Get webhook logs');
  console.log('   POST   /api/users             - Create user (triggers webhook)');
  console.log('   POST   /api/orders            - Create order (triggers webhook)');
  console.log('   PATCH  /api/orders/:id/complete - Complete order (triggers webhook)');
  console.log('   POST   /webhook-receiver      - Test webhook receiver');
  console.log('   GET    /api/logs              - View all delivery logs');
  console.log('   GET    /api/stats             - Dashboard stats\n');
});
