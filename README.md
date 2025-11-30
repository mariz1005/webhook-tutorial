# 🔔 Full-Stack Webhook Tutorial

**Learn how webhooks actually work with Node.js, MongoDB, and Vue.js**

This is a **complete, working example** that shows webhooks from database → backend → frontend, without using WebSocket.

---

## 📚 What are Webhooks? (Simplified)

Think of webhooks like **notifications for your app**:

1. **Registration**: "Hey backend, when someone signs up, notify my app at `http://myapp.com/webhook`"
2. **Event Happens**: User signs up on the backend
3. **Webhook Triggered**: Backend automatically sends POST request to your registered URL with the data
4. **Frontend Receives**: Your app gets the notification and can update the UI

**VS Traditional Polling:**
- ❌ Polling: "Any updates? ... Any updates? ... Any updates?" (keeps asking)
- ✅ Webhooks: Backend tells you immediately when something happens

---

## 🏗️ Project Structure

```
webhook-tutorial/
├── server.js          ← Node.js + Express backend
├── index.html         ← Vue.js frontend
├── package.json       ← Dependencies
├── .env.example       ← Configuration
└── README.md          ← This file
```

---

## 🚀 How to Run

### 1. **Install MongoDB (Local)**

**Windows - Using Chocolatey:**
```powershell
choco install mongodb-community
```

Or download from: https://www.mongodb.com/try/download/community

Start MongoDB service:
```powershell
net start MongoDB
```

---

### 2. **Setup Backend (Node.js)**

```powershell
# Navigate to project
cd webhook-tutorial

# Install dependencies
npm install

# Create .env file
copy .env.example .env

# Start server
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:5000
```

---

### 3. **Setup Frontend (Vue.js)**

**Option A: Simple HTTP Server**
```powershell
# Install Python (if not already)
# Then run in the webhook-tutorial folder:
python -m http.server 3000
```

Visit: **http://localhost:3000**

**Option B: Using npm simple-server**
```powershell
npm install -g simple-http-server
simple-http-server -p 3000
```

---

## 🔍 Understanding the Code Flow

### **Backend Flow: `server.js`**

```javascript
// 1. Frontend registers where to send webhooks
POST /api/webhooks/register
Body: {
  "name": "My Frontend",
  "url": "http://localhost:3000/webhook",
  "events": ["user.created"]
}

// 2. Backend stores this in MongoDB
// 3. Later, when event happens:

// 4. Someone triggers event
POST /api/events/trigger
Body: {
  "eventType": "user.created",
  "payload": { "userId": 123, "name": "John" }
}

// 5. Backend finds all webhooks listening to "user.created"
// 6. Backend sends POST to http://localhost:3000/webhook
// 7. Frontend receives the data!
```

### **Frontend Flow: `index.html`**

```javascript
// 1. User fills form and clicks "Register Webhook"
registerWebhook() {
  // Sends registration to backend
  axios.post('http://localhost:5000/api/webhooks/register', {...})
}

// 2. User clicks "Trigger Event"
triggerEvent() {
  // Tells backend to trigger webhook
  axios.post('http://localhost:5000/api/events/trigger', {...})
}

// 3. Frontend polls every 2 seconds (NO WebSocket!)
mounted() {
  setInterval(() => {
    axios.get('http://localhost:5000/api/webhook-events')
    // Updates display with new events
  }, 2000)
}
```

---

## 📋 API Endpoints Explained

### **1. Register a Webhook**
```
POST http://localhost:5000/api/webhooks/register

Request:
{
  "name": "My Service",
  "url": "http://localhost:3000/webhook",
  "events": ["user.created", "order.completed"]
}

Response:
{
  "success": true,
  "webhook": {...}
}
```

**What it does:** Saves where to send webhooks when events occur.

---

### **2. Trigger an Event**
```
POST http://localhost:5000/api/events/trigger

Request:
{
  "eventType": "user.created",
  "payload": {
    "userId": 123,
    "email": "john@example.com"
  }
}

Response:
{
  "success": true,
  "message": "Event triggered to 1 webhooks",
  "webhooksSent": 1
}
```

**What it does:** Tells backend to send webhook to all registered endpoints.

---

### **3. Get Webhook Events (Frontend Polls This)**
```
GET http://localhost:5000/api/webhook-events

Response:
[
  {
    "_id": "...",
    "eventType": "user.created",
    "payload": { "userId": 123, "email": "john@example.com" },
    "status": "delivered",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  ...
]
```

**What it does:** Returns all webhook events received. Frontend polls this every 2 seconds to update the display.

---

## 🧪 Test It Out

### **Quick Test (Recommended)**

1. **Start Backend:**
   ```powershell
   npm run dev
   ```

2. **Start Frontend:**
   ```powershell
   python -m http.server 3000
   ```

3. **Open Browser:** http://localhost:3000

4. **Register Webhook:**
   - Name: `My Frontend`
   - URL: `http://localhost:3000/webhook`
   - Events: `user.created, order.completed`
   - Click "Register Webhook"

5. **Trigger Event:**
   - Event Type: `user.created`
   - Payload: 
     ```json
     {
       "userId": 123,
       "name": "John Doe",
       "email": "john@example.com"
     }
     ```
   - Click "Trigger Event"

6. **Watch the Magic:** 
   - The event appears in "Webhook Events" section below 🎉

---

## 🔧 Using cURL/Postman to Test

You can also test the backend directly without the frontend:

```powershell
# 1. Register webhook
curl -X POST http://localhost:5000/api/webhooks/register `
  -H "Content-Type: application/json" `
  -d '{
    "name": "Test Webhook",
    "url": "http://localhost:3000/webhook",
    "events": ["user.created"]
  }'

# 2. Trigger event
curl -X POST http://localhost:5000/api/events/trigger `
  -H "Content-Type: application/json" `
  -d '{
    "eventType": "user.created",
    "payload": {"userId": 123, "name": "John"}
  }'

# 3. Get all events
curl http://localhost:5000/api/webhook-events
```

---

## ❓ FAQ

**Q: Why no WebSocket?**
A: Webhooks don't need WebSocket. They use simple HTTP POST requests. The frontend just polls the backend periodically to check for new events.

**Q: Can I use WebSocket instead?**
A: Yes! But webhooks are simpler - they're just HTTP POST requests. Add Socket.io if you want real-time updates later.

**Q: How do I deploy this?**
A: 
- Backend: Heroku, Railway, Vercel
- Frontend: Netlify, GitHub Pages, Vercel
- Database: MongoDB Atlas (cloud MongoDB)

**Q: Can I use in production?**
A: This is a tutorial. For production:
- Add authentication
- Add error handling
- Use webhooks from real services (Stripe, GitHub, Twilio)
- Implement webhook retries
- Add request validation

**Q: What real-world examples use webhooks?**
- Stripe (payment notifications)
- GitHub (push events, PR notifications)
- Twilio (SMS delivery confirmations)
- Shopify (order updates)
- Discord (bot messages)

---

## 📖 More Learning Resources

### **Video Tutorials (Recommended)**
- [Webhooks Explained - David Goggins Style](https://www.youtube.com/watch?v=41CN9gWA0FY) (TraversyMedia)
- [Node.js Webhooks Tutorial](https://www.youtube.com/watch?v=8jCCl1Tx-Ts) (The Net Ninja)

### **Articles**
- [What are Webhooks?](https://www.agora.io/en/webhooks-101/)
- [Building with Webhooks](https://zapier.com/blog/webhook/)

### **Advanced Topics**
- Webhook retries and error handling
- Webhook signing and security
- Real-time updates with Socket.io
- Serverless webhooks (AWS Lambda)

---

## 🎯 Next Steps

1. ✅ Get this working locally
2. ✅ Modify the payload to add more data
3. ✅ Add more event types (user.deleted, order.paid, etc.)
4. ✅ Add authentication to webhook endpoints
5. ✅ Deploy to the cloud
6. ✅ Integrate with real services (Stripe, GitHub, etc.)

---

## 💡 Key Concepts Summary

| Concept | Explanation |
|---------|------------|
| **Webhook** | HTTP callback that sends data from backend to frontend when events happen |
| **Registration** | Frontend tells backend where to send webhook data |
| **Trigger** | When something happens, backend sends webhook to registered URL |
| **Polling** | Frontend asks backend "any new events?" every few seconds |
| **Payload** | The data sent with the webhook (JSON) |
| **Event Type** | Name of what happened (user.created, order.completed, etc.) |

---

## 📞 Need Help?

- Check console (F12) for errors
- Make sure MongoDB is running
- Make sure both ports (3000, 5000) are open
- Check that URLs in registration match your setup

---

**Happy Learning! 🚀**

Remember: Webhooks are just **HTTP POST requests** sent automatically when events happen. No magic! 🎉
