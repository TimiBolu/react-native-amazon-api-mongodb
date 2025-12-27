import { Router } from 'express';
import Order from '../models/Order';
import User from '../models/User';
import Article from '../models/Article';
import { clerkMiddleware } from '@clerk/express';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

router.post('/payment-sheet', async (req, res) => {
  const { amount, currency, email } = req.body;
  // Use an existing Customer ID if this is a returning customer.
  const customer = await stripe.customers.create({
    email,
  });
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customer.id },
    { apiVersion: '2025-04-30.basil' as any } // Cast to any to avoid type issues with specific version
  );
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100,
    currency,
    customer: customer.id,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.json({
    paymentIntent: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customer: customer.id,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  });
});

// GET /orders - list orders for authenticated user (with items)
router.get('/', clerkMiddleware(), async (req: any, res) => {
  const { userId: clerkUserId } = req.auth;

  if (!clerkUserId) {
    res.status(401).json({ error: 'Could not find user' });
    return;
  }

  // 1. Find the internal user ID based on the Clerk user ID
  const user = await User.findOne({ clerkUserId });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // 2. Use the internal user ID to fetch orders
  const userOrders = await Order.find({ userId: user._id }).populate({
    path: 'items.article',
    model: 'Article',
  });

  const host = req.get('host');
  const protocol = req.protocol;

  const mappedOrders = userOrders.map((order) => {
    const orderObj = order.toObject();
    const items = orderObj.items.map((item: any) => {
      if (item.article) {
        item.article = {
          ...item.article,
          imageUrl: item.article.imageUrl
            ? `${protocol}://${host}/articles/image/${encodeURIComponent(item.article.imageUrl)}`
            : null,
          glbUrl: item.article.glbUrl
            ? `${protocol}://${host}/articles/glb/${encodeURIComponent(item.article.glbUrl)}`
            : null,
        };
      }
      return item;
    });
    return { ...orderObj, items };
  });

  res.json(mappedOrders);
});

// GET /orders/all - list all orders (admin, no auth for now)
router.get('/all', async (_req, res) => {
  const allOrders = await Order.find().populate({
    path: 'items.article',
    model: 'Article',
  });
  res.json(allOrders);
});

// GET /orders/:id - get a specific order by ID (no auth)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: 'Invalid order id' });
    return;
  }
  // Fetch the order
  const order = await Order.findById(id).populate({
    path: 'items.article',
    model: 'Article',
  });

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const host = req.get('host');
  const protocol = req.protocol;
  const orderObj = order.toObject();
  const items = orderObj.items.map((item: any) => {
    if (item.article) {
      item.article = {
        ...item.article,
        imageUrl: item.article.imageUrl
          ? `${protocol}://${host}/articles/image/${encodeURIComponent(item.article.imageUrl)}`
          : null,
        glbUrl: item.article.glbUrl
          ? `${protocol}://${host}/articles/glb/${encodeURIComponent(item.article.glbUrl)}`
          : null,
      };
    }
    return item;
  });

  res.json({ ...orderObj, items });
});

// POST /orders - create new order with items for authenticated user
router.post('/', clerkMiddleware(), async (req: any, res) => {
  const { userId: clerkUserId } = req.auth;

  if (!clerkUserId) {
    res.status(401).json({ error: 'Could not find user' });
    return;
  }

  // 1. Find the internal user ID based on the Clerk user ID
  const user = await User.findOne({ clerkUserId });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { items } = req.body; // items: [{ articleId, quantity }]
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Missing or invalid items' });
    return;
  }

  const orderItems = items.map((item: any) => ({
    article: item.articleId,
    quantity: item.quantity,
  }));

  const order = await Order.create({
    userId: user._id,
    items: orderItems,
  });

  res.status(201).json(order);
});

// PATCH /orders/:id - update order (e.g., items or status)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: 'Invalid order id' });
    return;
  }
  const { items, status } = req.body; // items: [{ articleId, quantity }]

  const updateData: any = {};
  if (status) updateData.status = status;
  if (Array.isArray(items)) {
    updateData.items = items.map((item: any) => ({
      article: item.articleId,
      quantity: item.quantity,
    }));
  }

  const updatedOrder = await Order.findByIdAndUpdate(id, updateData, { new: true }).populate({
    path: 'items.article',
    model: 'Article',
  });

  if (!updatedOrder) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  res.json(updatedOrder);
});

export default router;
