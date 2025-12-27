import { connectDB } from '../src/db';
import User from '../src/models/User';
import Article from '../src/models/Article';
import Order from '../src/models/Order';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function main() {
    console.log('🔍 Starting verification...');
    await connectDB();

    console.log('✅ Connected to MongoDB');

    // Test User
    const testUser = await User.create({
        clerkUserId: `test_${Date.now()}`,
        email: 'test@example.com',
    });
    console.log('✅ User created:', testUser._id);

    // Test Article
    const testArticle = await Article.create({
        title: 'Test Article',
        price: 100,
    });
    console.log('✅ Article created:', testArticle._id);

    // Test Order
    const testOrder = await Order.create({
        userId: testUser._id,
        items: [{ article: testArticle._id, quantity: 1 }],
    });
    console.log('✅ Order created:', testOrder._id);

    // Test Populate
    const fetchedOrder = await Order.findById(testOrder._id).populate({
        path: 'items.article',
        model: 'Article',
    });

    if (fetchedOrder && (fetchedOrder.items[0].article as any).title === 'Test Article') {
        console.log('✅ Populate working');
    } else {
        console.error('❌ Populate failed');
    }

    // Cleanup
    await Order.findByIdAndDelete(testOrder._id);
    await Article.findByIdAndDelete(testArticle._id);
    await User.findByIdAndDelete(testUser._id);
    console.log('✅ Cleanup complete');

    await mongoose.disconnect();
    console.log('🎉 Verification successful!');
}

main().catch((e) => {
    console.error('❌ Verification failed:', e);
    process.exit(1);
});
