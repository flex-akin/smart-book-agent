// models/Scrape.ts
import { EScrapeStatus } from '../scrape/scrape.types';
import { Model, Column, Table, DataType } from 'sequelize-typescript';

@Table({
  tableName: 'books',
  timestamps: true,
})
export default class Books extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column(DataType.STRING)
  declare title: string;

  @Column(DataType.STRING)
  declare author: string;

  @Column(DataType.STRING)
  declare currentPrice: string;

  @Column(DataType.STRING)
  declare originalPrice: string;

  @Column(DataType.STRING)
  declare discount: string;

  @Column(DataType.FLOAT)
  declare discountAmount: number;

  @Column(DataType.FLOAT)
  declare discountPercentage: number;

  @Column(DataType.STRING)
  declare sku: string;

  @Column(DataType.STRING)
  declare imageUrl: string;

  @Column(DataType.STRING)
  declare publisher: string;

  @Column(DataType.TEXT)
  declare description: string;

  @Column(DataType.TEXT)
  declare summary: string;

  @Column(DataType.INTEGER)
  declare relevanceScore: number;

  @Column(DataType.FLOAT)
  declare valueScore: number;

  @Column(DataType.STRING)
  declare url: string;

  @Column({
  type: DataType.UUID,
  allowNull: false,
})
declare jobId: string;
}
