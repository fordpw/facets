import React from 'react';
import { Card, CardHeader, CardBody } from '../../components/common';

const ProvidersPage = () => {
  return (
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
};

export default ProvidersPage;