import { EScrapeStatus } from '../scrape/scrape.types';
import { Model, Column, Table, DataType } from 'sequelize-typescript';

@Table({
  tableName: 'scrape',
  timestamps: true,
})
export default class Scrape extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({
    type: DataType.ENUM(...Object.values(EScrapeStatus)),
    allowNull: false,
  })
  declare status: EScrapeStatus;
}