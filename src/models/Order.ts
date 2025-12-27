import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { IArticle } from './Article';

export interface IOrderItem {
    article: IArticle['_id'];
    quantity: number;
}

export interface IOrder extends Document {
    userId: IUser['_id'];
    items: IOrderItem[];
    status: string;
    createdAt: Date;
}

const OrderItemSchema = new Schema({
    article: { type: Schema.Types.ObjectId, ref: 'Article', required: true },
    quantity: { type: Number, required: true },
});

const OrderSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [OrderItemSchema],
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IOrder>('Order', OrderSchema);
