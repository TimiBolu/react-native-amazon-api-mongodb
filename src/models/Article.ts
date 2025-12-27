import mongoose, { Document, Schema } from 'mongoose';

export interface IArticle extends Document {
    title: string;
    description?: string;
    price: number;
    imageUrl?: string;
    glbUrl?: string;
    createdAt: Date;
}

const ArticleSchema: Schema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    imageUrl: { type: String },
    glbUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IArticle>('Article', ArticleSchema);
