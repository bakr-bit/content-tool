import axios, { AxiosInstance, AxiosError } from 'axios';
import { env } from '../../config/env';
import { createChildLogger } from '../../utils/logger';
import { ExternalServiceError } from '../../utils/errors';
import {
  Site,
  CreateSiteInput,
  UpdateSiteInput,
  Brand,
  CreateBrandInput,
  UpdateBrandInput,
  Toplist,
  CreateToplistInput,
  UpdateToplistInput,
  ToplistWithItems,
  ToplistItem,
  ToplistItemInput,
  ResolvedToplist,
  UpdateItemsResponse,
  DeleteSiteResponse,
  ToplistApiError,
} from './types';

const logger = createChildLogger('ToplistApiClient');

/**
 * HTTP client for the external Toplist API.
 * Handles authentication, error mapping, and provides typed methods for all endpoints.
 */
class ToplistApiClient {
  private client: AxiosInstance;
  private enabled: boolean;

  constructor() {
    this.enabled = !!env.TOPLIST_API_KEY;

    this.client = axios.create({
      baseURL: env.TOPLIST_API_URL,
      headers: {
        'X-API-Key': env.TOPLIST_API_KEY || '',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Log configuration on startup
    if (this.enabled) {
      logger.info({ baseURL: env.TOPLIST_API_URL }, 'Toplist API client initialized');
    } else {
      logger.warn('Toplist API client disabled - TOPLIST_API_KEY not configured');
    }
  }

  /**
   * Check if the toplist API integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Ensure the client is enabled before making requests
   */
  private ensureEnabled(): void {
    if (!this.enabled) {
      throw new ExternalServiceError('ToplistAPI', 'Toplist API integration not configured');
    }
  }

  /**
   * Handle axios errors and convert to ExternalServiceError
   */
  private handleError(error: unknown, operation: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ToplistApiError>;
      const status = axiosError.response?.status;
      const message = axiosError.response?.data?.error || axiosError.message;

      logger.error(
        { operation, status, error: message },
        'Toplist API request failed'
      );

      throw new ExternalServiceError('ToplistAPI', `${operation}: ${message}`);
    }

    logger.error({ operation, error }, 'Unexpected error in Toplist API request');
    throw error;
  }

  // ===========================================================================
  // Sites
  // ===========================================================================

  async listSites(): Promise<Site[]> {
    this.ensureEnabled();
    try {
      logger.debug('Listing all sites');
      const response = await this.client.get<Site[]>('/api/sites');
      return response.data;
    } catch (error) {
      this.handleError(error, 'listSites');
    }
  }

  async createSite(data: CreateSiteInput): Promise<Site> {
    this.ensureEnabled();
    try {
      logger.info({ domain: data.domain, name: data.name }, 'Creating site');
      const response = await this.client.post<Site>('/api/sites', data);
      logger.info({ siteKey: response.data.siteKey }, 'Site created');
      return response.data;
    } catch (error) {
      this.handleError(error, 'createSite');
    }
  }

  async getSite(siteKey: string): Promise<Site> {
    this.ensureEnabled();
    try {
      logger.debug({ siteKey }, 'Getting site');
      const response = await this.client.get<Site>(`/api/sites/${siteKey}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'getSite');
    }
  }

  async updateSite(siteKey: string, data: UpdateSiteInput): Promise<Site> {
    this.ensureEnabled();
    try {
      logger.info({ siteKey, updates: Object.keys(data) }, 'Updating site');
      const response = await this.client.put<Site>(`/api/sites/${siteKey}`, data);
      return response.data;
    } catch (error) {
      this.handleError(error, 'updateSite');
    }
  }

  async deleteSite(siteKey: string): Promise<DeleteSiteResponse> {
    this.ensureEnabled();
    try {
      logger.info({ siteKey }, 'Deleting site');
      const response = await this.client.delete<DeleteSiteResponse>(`/api/sites/${siteKey}`);
      logger.info({ siteKey, deletedToplistCount: response.data.deletedToplistCount }, 'Site deleted');
      return response.data;
    } catch (error) {
      this.handleError(error, 'deleteSite');
    }
  }

  // ===========================================================================
  // Toplists
  // ===========================================================================

  async listToplists(siteKey: string): Promise<Toplist[]> {
    this.ensureEnabled();
    try {
      logger.debug({ siteKey }, 'Listing toplists for site');
      const response = await this.client.get<Toplist[]>(`/api/sites/${siteKey}/toplists`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'listToplists');
    }
  }

  async createToplist(siteKey: string, data: CreateToplistInput): Promise<Toplist> {
    this.ensureEnabled();
    try {
      logger.info({ siteKey, slug: data.slug }, 'Creating toplist');
      const response = await this.client.post<Toplist>(`/api/sites/${siteKey}/toplists`, data);
      logger.info({ siteKey, toplistId: response.data.id }, 'Toplist created');
      return response.data;
    } catch (error) {
      this.handleError(error, 'createToplist');
    }
  }

  async getToplist(siteKey: string, slug: string): Promise<ResolvedToplist> {
    this.ensureEnabled();
    try {
      logger.debug({ siteKey, slug }, 'Getting toplist');
      const response = await this.client.get<ResolvedToplist>(`/api/sites/${siteKey}/toplists/${slug}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'getToplist');
    }
  }

  async updateToplist(siteKey: string, slug: string, data: UpdateToplistInput): Promise<Toplist> {
    this.ensureEnabled();
    try {
      logger.info({ siteKey, slug, updates: Object.keys(data) }, 'Updating toplist');
      const response = await this.client.put<Toplist>(`/api/sites/${siteKey}/toplists/${slug}`, data);
      return response.data;
    } catch (error) {
      this.handleError(error, 'updateToplist');
    }
  }

  async deleteToplist(siteKey: string, slug: string): Promise<void> {
    this.ensureEnabled();
    try {
      logger.info({ siteKey, slug }, 'Deleting toplist');
      await this.client.delete(`/api/sites/${siteKey}/toplists/${slug}`);
      logger.info({ siteKey, slug }, 'Toplist deleted');
    } catch (error) {
      this.handleError(error, 'deleteToplist');
    }
  }

  // ===========================================================================
  // Toplist Items
  // ===========================================================================

  async getToplistItems(siteKey: string, slug: string): Promise<ToplistWithItems> {
    this.ensureEnabled();
    try {
      logger.debug({ siteKey, slug }, 'Getting toplist items');
      const response = await this.client.get<ToplistWithItems>(
        `/api/sites/${siteKey}/toplists/${slug}/items`
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'getToplistItems');
    }
  }

  async updateToplistItems(
    siteKey: string,
    slug: string,
    items: ToplistItemInput[]
  ): Promise<UpdateItemsResponse> {
    this.ensureEnabled();
    try {
      logger.info({ siteKey, slug, itemCount: items.length }, 'Updating toplist items');
      const response = await this.client.put<UpdateItemsResponse>(
        `/api/sites/${siteKey}/toplists/${slug}/items`,
        { items }
      );
      logger.info({ siteKey, slug, itemCount: response.data.itemCount }, 'Toplist items updated');
      return response.data;
    } catch (error) {
      this.handleError(error, 'updateToplistItems');
    }
  }

  // ===========================================================================
  // Brands (global)
  // ===========================================================================

  async listBrands(): Promise<Brand[]> {
    this.ensureEnabled();
    try {
      logger.debug('Listing all brands');
      const response = await this.client.get<Brand[]>('/api/brands');
      return response.data;
    } catch (error) {
      this.handleError(error, 'listBrands');
    }
  }

  async createBrand(data: CreateBrandInput): Promise<Brand> {
    this.ensureEnabled();
    try {
      logger.info({ brandId: data.brandId, name: data.name }, 'Creating brand');
      const response = await this.client.post<Brand>('/api/brands', data);
      logger.info({ brandId: response.data.brandId }, 'Brand created');
      return response.data;
    } catch (error) {
      this.handleError(error, 'createBrand');
    }
  }

  async getBrand(brandId: string): Promise<Brand> {
    this.ensureEnabled();
    try {
      logger.debug({ brandId }, 'Getting brand');
      const response = await this.client.get<Brand>(`/api/brands/${brandId}`);
      return response.data;
    } catch (error) {
      this.handleError(error, 'getBrand');
    }
  }

  async updateBrand(brandId: string, data: UpdateBrandInput): Promise<Brand> {
    this.ensureEnabled();
    try {
      logger.info({ brandId, updates: Object.keys(data) }, 'Updating brand');
      const response = await this.client.put<Brand>(`/api/brands/${brandId}`, data);
      return response.data;
    } catch (error) {
      this.handleError(error, 'updateBrand');
    }
  }

  async deleteBrand(brandId: string): Promise<void> {
    this.ensureEnabled();
    try {
      logger.info({ brandId }, 'Deleting brand');
      await this.client.delete(`/api/brands/${brandId}`);
      logger.info({ brandId }, 'Brand deleted');
    } catch (error) {
      this.handleError(error, 'deleteBrand');
    }
  }
}

export const toplistApiClient = new ToplistApiClient();
