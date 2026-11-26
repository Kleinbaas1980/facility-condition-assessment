import {http} from './http';
import type {RateTemplate} from '@/lib/qs-rate-library';
export const rateLibraryApi={list:async()=>(await http.get<RateTemplate[]>('/rate-library')).data};
