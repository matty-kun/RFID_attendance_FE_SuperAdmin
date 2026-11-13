import { adminService } from '../../../services/adminService';
import { LocationRecord, CreateLocationPayload } from '../models';

export const locationService = {
  async getLocations(): Promise<LocationRecord[]> {
    return adminService.getLocations() as Promise<LocationRecord[]>;
  },

  async createLocation(payload: CreateLocationPayload): Promise<LocationRecord> {
    return adminService.createLocation(payload) as Promise<LocationRecord>;
  },
  async updateLocation(locationId: string, name: string): Promise<LocationRecord> {
    return adminService.updateLocation(locationId, name) as Promise<LocationRecord>;
  },
  async deleteLocation(locationId: string): Promise<void> {
    await adminService.deleteLocation(locationId);
  },
};
