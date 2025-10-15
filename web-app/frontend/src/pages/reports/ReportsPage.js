import React from 'react';
import { Card, CardHeader, CardBody } from '../../components/common';

const ReportsPage = () => {
  return (
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
};

export default ReportsPage;