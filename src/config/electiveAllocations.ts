export interface MdmAllocation {
  code: string;
  name: string;
  labCode?: string;
  labName?: string;
}

export interface OeAllocation {
  code: string;
  name: string;
}

/**
 * Elective allocations dictionary (keyed by student USN).
 * Student elective data is resolved dynamically at runtime from the college spreadsheet.
 */
export const STUDENT_MDM_ALLOCATIONS: Record<string, MdmAllocation> = {};

export const STUDENT_OE_ALLOCATIONS: Record<string, OeAllocation> = {};
