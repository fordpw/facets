import React from 'react';
import { Card, CardHeader, CardBody } from '../components/common';

// Providers Pages
export const ProvidersPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Providers</h2>
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium">Healthcare Providers</h3>
      </CardHeader>
      <CardBody>
        <p>Provider management functionality will be available here.</p>
      </CardBody>
    </Card>
  </div>
);

export const ProviderDetailsPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Provider Details</h2>
    <Card>
      <CardBody>
        <p>Provider details will be displayed here.</p>
      </CardBody>
    </Card>
  </div>
);

export const ProviderFormPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Provider Form</h2>
    <Card>
      <CardBody>
        <p>Provider creation/editing form will be available here.</p>
      </CardBody>
    </Card>
  </div>
);

// Claims Pages
export const ClaimsPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Claims</h2>
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium">Insurance Claims</h3>
      </CardHeader>
      <CardBody>
        <p>Claims management functionality will be available here.</p>
      </CardBody>
    </Card>
  </div>
);

export const ClaimDetailsPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Claim Details</h2>
    <Card>
      <CardBody>
        <p>Claim details will be displayed here.</p>
      </CardBody>
    </Card>
  </div>
);

export const ClaimFormPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Claim Form</h2>
    <Card>
      <CardBody>
        <p>Claim creation/editing form will be available here.</p>
      </CardBody>
    </Card>
  </div>
);

// Plans Pages
export const PlansPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Insurance Plans</h2>
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium">Health Insurance Plans</h3>
      </CardHeader>
      <CardBody>
        <p>Insurance plans management functionality will be available here.</p>
      </CardBody>
    </Card>
  </div>
);

export const PlanDetailsPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Plan Details</h2>
    <Card>
      <CardBody>
        <p>Plan details will be displayed here.</p>
      </CardBody>
    </Card>
  </div>
);

export const PlanFormPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Plan Form</h2>
    <Card>
      <CardBody>
        <p>Plan creation/editing form will be available here.</p>
      </CardBody>
    </Card>
  </div>
);

// Employers Pages
export const EmployersPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Employers</h2>
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium">Group Coverage Sponsors</h3>
      </CardHeader>
      <CardBody>
        <p>Employer management functionality will be available here.</p>
      </CardBody>
    </Card>
  </div>
);

export const EmployerDetailsPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Employer Details</h2>
    <Card>
      <CardBody>
        <p>Employer details will be displayed here.</p>
      </CardBody>
    </Card>
  </div>
);

export const EmployerFormPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Employer Form</h2>
    <Card>
      <CardBody>
        <p>Employer creation/editing form will be available here.</p>
      </CardBody>
    </Card>
  </div>
);

// Reports Page
export const ReportsPage = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Claims Summary</h3>
        </CardHeader>
        <CardBody>
          <p>Claims summary reports and analytics will be available here.</p>
        </CardBody>
      </Card>
      
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Provider Performance</h3>
        </CardHeader>
        <CardBody>
          <p>Provider performance metrics and reports will be available here.</p>
        </CardBody>
      </Card>
      
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Financial Analytics</h3>
        </CardHeader>
        <CardBody>
          <p>Financial reports and analytics will be available here.</p>
        </CardBody>
      </Card>
    </div>
  </div>
);

export default {
  ProvidersPage,
  ProviderDetailsPage,
  ProviderFormPage,
  ClaimsPage,
  ClaimDetailsPage,
  ClaimFormPage,
  PlansPage,
  PlanDetailsPage,
  PlanFormPage,
  EmployersPage,
  EmployerDetailsPage,
  EmployerFormPage,
  ReportsPage,
};