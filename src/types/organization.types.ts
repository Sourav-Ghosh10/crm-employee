export interface Department {
    _id: string;
    name: string;
    description?: string;
    isActive: boolean;
    employeeCount?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface Designation {
    _id: string;
    title: string;
    department?: string;
    description?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface OrganizationResponse<T> {
    success: boolean;
    data: T[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}
