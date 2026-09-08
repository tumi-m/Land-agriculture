export interface Department {
  id: 'dlrrd' | 'doa';
  name: string;
  abbr: string;
  owns: string;
  minister: string;
  deputy: string;
  dg: string;
  switchboard: string;
  enquiries?: string;
  email: string;
  address: string;
  postal?: string;
}

/**
 * Since the 2024 split, land comes from one department and the support that
 * makes it productive from the other.
 */
export const DEPARTMENTS: Department[] = [
  {
    id: 'dlrrd',
    name: 'Department of Land Reform and Rural Development',
    abbr: 'DLRRD',
    owns: 'Acquires the land, runs the allocation, holds the lease.',
    minister: 'Mzwanele Nyhontso',
    deputy: 'Chupu Stanley Mathabatha',
    dg: 'Bongikhaya Dayimani (Acting: Clinton Heimann)',
    switchboard: '(012) 312 8911',
    enquiries: '(012) 312 8425',
    email: 'queries@ruraldevelopment.gov.za',
    address: 'Old Building, 184 cnr Jeff Masemola and Paul Kruger Streets, Pretoria 0001',
    postal: 'Private Bag X833, Pretoria 0001',
  },
  {
    id: 'doa',
    name: 'Department of Agriculture',
    abbr: 'DoA',
    owns: 'Production economics, biosecurity, trade, extension and farmer development.',
    minister: 'John Steenhuisen',
    deputy: 'Nokuzola Capa',
    dg: 'Mooketsa Ramasodi',
    switchboard: '(012) 319 6000',
    enquiries: '(012) 319 7169',
    email: 'webadmin@nda.agric.za',
    address: 'Agriculture Place, 20 Steve Biko Street, Arcadia, Pretoria 0002',
  },
];

export const COORDINATION =
  'An Inter-Ministerial Committee on Agriculture and Land Reform, chaired by the Deputy President, is meant to keep allocations matched with extension support, CASP grants and Land Bank credit.';
