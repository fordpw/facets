import React from 'react';
import { Card, CardHeader, CardBody } from '../../components/common';

const EmployersPage = () => {
  return (
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
};

export default EmployersPage;