import Article from '../src/models/Article';
import { connectDB } from '../src/db';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  await connectDB();
  const filePath = path.join(__dirname, '../assets/products/dummy_items.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  for (const item of data) {
    await Article.create({
      title: item.title,
      description: item.description,
      price: Math.round(item.price), // articles.price is integer
      imageUrl: item.image || null,
      glbUrl: item.glb || null,
      // createdAt will default to now
    });
  }
  console.log('Import complete!');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
