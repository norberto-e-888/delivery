import { Point } from './point';
import { Coordinates } from './validators';

export const coordinatesToPoint = ({
  longitude,
  latitude,
}: Coordinates): Point => ({
  type: 'Point',
  coordinates: [longitude, latitude],
});
