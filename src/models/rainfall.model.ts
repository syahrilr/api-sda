import mongoose, { Document, Schema, Connection } from 'mongoose';

export interface IMarker {
  lat: number;
  lng: number;
  name: string;
  time: string;
  id: string;
  dbz: number;
  rainRate: number;
  intensity: string;
}

export interface ILocation {
  type: string;
  radarStation: string;
  radarImage: string;
  radarImageUrl: string;
  screenshot: string;
  coordinates: number[];
}

export interface IMetadata {
  radarTime: string;
  bounds: any;
  zoom: any;
  totalDetected: number;
  locationsWithRain: number;
  maxRainRate: number;
  alertCount: number;
  hasScreenshot: boolean;
  isAutoDetected: boolean;
  isAlert: boolean;
}

export interface IRainfallRecord extends Document {
  location: ILocation;
  markers: IMarker[];
  detectedLocations: any[];
  bounds: {
    sw: number[];
    ne: number[];
  };
  notes: string;
  metadata: IMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const MarkerSchema = new Schema<IMarker>({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  name: { type: String, required: true },
  time: { type: String, required: true },
  id: { type: String, required: true },
  dbz: { type: Number, default: 0 },
  rainRate: { type: Number, default: 0 },
  intensity: { type: String, default: 'No Rain' }
}, { _id: false });

const LocationSchema = new Schema<ILocation>({
  type: { type: String, default: 'Point' },
  radarStation: { type: String, required: true },
  radarImage: String,
  radarImageUrl: String,
  screenshot: String,
  coordinates: [Number]
}, { _id: false });

const MetadataSchema = new Schema<IMetadata>({
  radarTime: { type: String, required: true },
  bounds: Schema.Types.Mixed,
  zoom: Schema.Types.Mixed,
  totalDetected: { type: Number, default: 0 },
  locationsWithRain: { type: Number, default: 0 },
  maxRainRate: { type: Number, default: 0 },
  alertCount: { type: Number, default: 0 },
  hasScreenshot: { type: Boolean, default: false },
  isAutoDetected: { type: Boolean, default: true },
  isAlert: { type: Boolean, default: false }
}, { _id: false });

const RainfallSchema = new Schema<IRainfallRecord>({
  location: { type: LocationSchema, required: true },
  markers: [MarkerSchema],
  detectedLocations: [Schema.Types.Mixed],
  bounds: {
    sw: [Number],
    ne: [Number]
  },
  notes: String,
  metadata: { type: MetadataSchema, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'rainfall_records',
  timestamps: true
});

// Indexes for better query performance
RainfallSchema.index({ 'metadata.radarTime': -1 });
RainfallSchema.index({ 'markers.name': 1 });
RainfallSchema.index({ 'location.radarStation': 1 });

/**
 * Get RainfallRecord model for a specific connection
 * @param connection - Mongoose connection
 * @returns RainfallRecord model
 */
export const getRainfallModel = (connection: Connection) => {
  return connection.model<IRainfallRecord>('RainfallRecord', RainfallSchema);
};

// Default export untuk backward compatibility
export const RainfallRecord = mongoose.model<IRainfallRecord>('RainfallRecord', RainfallSchema);
