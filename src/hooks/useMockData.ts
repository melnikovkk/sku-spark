import { useState, useCallback, useEffect } from 'react';
import type { Job, AgentMessage, SKUData, Evidence, BudgetData, JobStatus } from '@/types/job';

// Mock data generators
const createMockSKUData = (jobId: string): SKUData => ({
  id: jobId,
  mpn: { value: 'CE285A', status: 'verified', confidence: 95 },
  brand: { value: 'HP', status: 'verified', confidence: 98 },
  yield: { value: '1600 pages', status: 'pending', confidence: 72 },
  dimensions: { value: '12.5 x 3.8 x 5.2 cm', status: 'conflict', confidence: 65 },
  weight: { value: '0.45 kg', status: 'pending', confidence: 80 },
  heroImage: {
    url: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400&h=300&fit=crop',
    qcStatus: 'pending',
  },
});

const createMockEvidence = (fieldName: string): Evidence[] => [
  {
    id: '1',
    fieldName,
    value: 'CE285A',
    sourceUrl: 'https://hp.com/products/ce285a',
    sourceType: 'official',
    snippet: 'HP 85A Black Original LaserJet Toner Cartridge (CE285A)',
    confidence: 95,
    verified: true,
    fetchedAt: new Date(Date.now() - 3600000),
  },
  {
    id: '2',
    fieldName,
    value: 'CE285A',
    sourceUrl: 'https://amazon.com/dp/B003X7XQRU',
    sourceType: 'marketplace',
    snippet: 'HP CE285A Black Toner Cartridge - Original HP product',
    confidence: 88,
    verified: false,
    fetchedAt: new Date(Date.now() - 7200000),
  },
  {
    id: '3',
    fieldName,
    value: 'CE285AD',
    sourceUrl: 'https://forum.printerhelp.com/thread/12345',
    sourceType: 'forum',
    snippet: 'User confirms CE285AD is the dual pack variant of CE285A',
    confidence: 45,
    verified: false,
    fetchedAt: new Date(Date.now() - 86400000),
  },
];

const mockJobs: Job[] = [
  {
    id: 'job-001',
    inputString: 'HP CE285A Black Toner Cartridge Original LaserJet Pro P1102w',
    mpn: 'CE285A',
    brand: 'HP',
    status: 'running',
    createdAt: new Date(Date.now() - 120000),
    updatedAt: new Date(),
    cost: 0.23,
    duration: 120,
    tokenUsage: 4500,
  },
  {
    id: 'job-002',
    inputString: 'Brother TN-2420 High Yield Black Toner Cartridge',
    mpn: 'TN-2420',
    brand: 'Brother',
    status: 'completed',
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(Date.now() - 3300000),
    cost: 0.41,
    duration: 300,
    tokenUsage: 8200,
  },
  {
    id: 'job-003',
    inputString: 'Canon CLI-551 CMYK Multipack Ink Cartridges',
    mpn: 'CLI-551',
    brand: 'Canon',
    status: 'needs_review',
    createdAt: new Date(Date.now() - 7200000),
    updatedAt: new Date(Date.now() - 7000000),
    cost: 0.35,
    duration: 200,
    tokenUsage: 6800,
  },
  {
    id: 'job-004',
    inputString: 'Epson T1285 DURABrite Ultra Ink Cartridge Set',
    mpn: '',
    brand: 'Epson',
    status: 'blocked',
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86000000),
    cost: 0.12,
    duration: 45,
    tokenUsage: 2100,
  },
  {
    id: 'job-005',
    inputString: 'Samsung MLT-D111S Black Toner for Xpress M2020/M2070',
    mpn: 'MLT-D111S',
    brand: 'Samsung',
    status: 'ready_to_publish',
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(Date.now() - 172400000),
    cost: 0.48,
    duration: 400,
    tokenUsage: 9500,
  },
];

const mockAgentMessages: AgentMessage[] = [
  {
    id: 'msg-1',
    type: 'plan',
    content: 'Starting enrichment pipeline for HP CE285A. Planning to execute: Spec Extraction → Brand Verification → Image Search → Marketplace Validation.',
    timestamp: new Date(Date.now() - 115000),
    agentName: 'Orchestrator',
    taskId: 'task-001',
  },
  {
    id: 'msg-2',
    type: 'activity',
    content: 'Searching official HP product database for CE285A specifications...',
    timestamp: new Date(Date.now() - 100000),
    agentName: 'Spec Extractor',
    taskId: 'task-002',
  },
  {
    id: 'msg-3',
    type: 'result',
    content: 'Successfully extracted MPN: CE285A, Brand: HP from official source with 95% confidence.',
    timestamp: new Date(Date.now() - 85000),
    agentName: 'Spec Extractor',
    taskId: 'task-002',
  },
  {
    id: 'msg-4',
    type: 'activity',
    content: 'Cross-referencing yield specifications across Amazon, HP Store, and Office Depot...',
    timestamp: new Date(Date.now() - 70000),
    agentName: 'Data Validator',
    taskId: 'task-003',
  },
  {
    id: 'msg-5',
    type: 'decision',
    content: 'Found conflicting dimension values: HP official shows "12.5 x 3.8 x 5.2 cm" vs Amazon listing "12.8 x 4.0 x 5.5 cm". Please select which source to trust.',
    timestamp: new Date(Date.now() - 55000),
    agentName: 'Conflict Resolver',
    taskId: 'task-004',
  },
];

export function useMockData() {
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [skuData, setSkuData] = useState<SKUData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const budgetData: BudgetData = {
    tokenUsage: jobs.reduce((sum, j) => sum + j.tokenUsage, 0),
    tokenLimit: 100000,
    estimatedCost: jobs.reduce((sum, j) => sum + j.cost, 0),
    costLimit: 10.0,
    apiCalls: 47,
    apiCallLimit: 500,
  };

  const selectJob = useCallback((job: Job) => {
    setSelectedJob(job);
    setSkuData(createMockSKUData(job.id));
    
    if (job.status === 'running') {
      setAgentMessages(mockAgentMessages);
      setIsProcessing(true);
    } else {
      setAgentMessages(mockAgentMessages.slice(0, 3));
      setIsProcessing(false);
    }
  }, []);

  const createJob = useCallback((input: string) => {
    const newJob: Job = {
      id: `job-${Date.now()}`,
      inputString: input,
      mpn: '',
      brand: '',
      status: 'running',
      createdAt: new Date(),
      updatedAt: new Date(),
      cost: 0,
      duration: 0,
      tokenUsage: 0,
    };
    setJobs(prev => [newJob, ...prev]);
    selectJob(newJob);
  }, [selectJob]);

  const getEvidence = useCallback((fieldName: string) => {
    return createMockEvidence(fieldName);
  }, []);

  const getFilterCounts = useCallback(() => {
    const counts: Record<JobStatus | 'all', number> = {
      all: jobs.length,
      running: 0,
      completed: 0,
      failed: 0,
      needs_review: 0,
      blocked: 0,
      ready_to_publish: 0,
    };
    
    jobs.forEach(job => {
      counts[job.status]++;
    });
    
    return counts;
  }, [jobs]);

  // Simulate real-time updates when a job is running
  useEffect(() => {
    if (!selectedJob || selectedJob.status !== 'running') return;

    const interval = setInterval(() => {
      setJobs(prev => prev.map(j => {
        if (j.id === selectedJob.id) {
          return {
            ...j,
            duration: j.duration + 1,
            cost: j.cost + 0.001,
            tokenUsage: j.tokenUsage + Math.floor(Math.random() * 50),
          };
        }
        return j;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedJob]);

  return {
    jobs,
    selectedJob,
    agentMessages,
    skuData,
    budgetData,
    isProcessing,
    selectJob,
    createJob,
    getEvidence,
    getFilterCounts,
    setSkuData,
  };
}
