import { adminService } from '../../../services/adminService';
import { LocationRecord, CreateLocationPayload } from '../models';

export const locationService = {
  async getLocations(): Promise<LocationRecord[]> {
    return adminService.getLocations() as Promise<LocationRecord[]>;
  },

  async createLocation(payload: CreateLocationPayload): Promise<LocationRecord> {
    return adminService.createLocation(payload) as Promise<LocationRecord>;
  },
};
