import { FarmRecord, InputLogEntry, CropStage } from '../types';

const STORAGE_KEY = 'smartagri_farm_history';

// Initialize with a demo state: 1 Active Crop, 1 Past Crop
const SEED_DATA: FarmRecord[] = [
  {
    id: 'active_1',
    season: 'Kharif 2024',
    crop: 'Tomato',
    sowingDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
    status: 'Active',
    stage: 'Vegetative',
    area: 2.5,
    inputs: [
        { id: 'i1', type: 'Compost', quantity: '500 kg', date: Date.now() - 40 * 24 * 60 * 60 * 1000, cost: 2000 },
        { id: 'i2', type: 'DAP', quantity: '50 kg', date: Date.now() - 10 * 24 * 60 * 60 * 1000, cost: 1350 }
    ],
    issue: null
  },
  {
    id: 'hist_1',
    season: 'Rabi 2023',
    crop: 'Wheat',
    sowingDate: '2023-11-01T00:00:00.000Z',
    harvestDate: '2024-03-15T00:00:00.000Z',
    status: 'Harvested',
    area: 2.5,
    inputs: [],
    yield: 'High',
    issue: null,
    profit: 'High'
  }
];

export const farmRecordService = {
  getRecords(): FarmRecord[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
      return SEED_DATA;
    }
    return JSON.parse(stored);
  },

  getActiveCrop(): FarmRecord | undefined {
    const records = this.getRecords();
    return records.find(r => r.status === 'Active');
  },

  getHistory(): FarmRecord[] {
    const records = this.getRecords();
    return records.filter(r => r.status === 'Harvested');
  },

  addInput(recordId: string, input: Omit<InputLogEntry, 'id'>) {
    const records = this.getRecords();
    const index = records.findIndex(r => r.id === recordId);
    if (index !== -1) {
        const newEntry: InputLogEntry = { ...input, id: Date.now().toString() };
        records[index].inputs.unshift(newEntry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
  },

  harvestCrop(recordId: string, yieldResult: string, profit: 'High' | 'Average' | 'Loss') {
    const records = this.getRecords();
    const index = records.findIndex(r => r.id === recordId);
    if (index !== -1) {
        records[index].status = 'Harvested';
        records[index].harvestDate = new Date().toISOString();
        records[index].yield = yieldResult;
        records[index].profit = profit;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
  },

  // AI Logic: Detect repetitive mistakes or issues
  getAIInsight(currentCrop: string): { warning: boolean, messageKey: string } | null {
    const history = this.getHistory();
    // Check if current crop had issues in the past
    const pastIssues = history.filter(
      r => r.crop.toLowerCase().includes(currentCrop.toLowerCase()) && (r.issue || r.profit === 'Loss')
    );

    if (pastIssues.length > 0) {
      return {
        warning: true,
        messageKey: 'historyWarning' // Maps to UI_TEXT
      };
    }
    return null;
  }
};