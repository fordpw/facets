import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { toast } from 'react-toastify';
import { 
  Card, CardHeader, CardBody, Button, Input, Select, Badge, 
  Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell, 
  Pagination, LoadingSpinner, EmptyState 
} from '../../components/common';
import { healthcareAPI, apiHelpers } from '../../utils/api';

const MembersPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({
    firstName: '',
    lastName: '',
    memberId: '',
    planId: '',
    status: 'ACTIVE',
    dateOfBirth: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Build query parameters
  const queryParams = useMemo(() => {
    return apiHelpers.buildParams(
      filters,
      { page: currentPage, limit: pageSize },
      { sortBy, sortOrder }
    );
  }, [filters, currentPage, pageSize, sortBy, sortOrder]);

  // Fetch members data
  const { data, isLoading, error, refetch } = useQuery(
    ['members', queryParams],
    () => healthcareAPI.members.getAll(queryParams),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch plans for filter dropdown
  const { data: plansData } = useQuery(
    'plans-list',
    () => healthcareAPI.plans.getAll({ limit: 100 }),
    { staleTime: 10 * 60 * 1000 }
  );

  const members = data?.data?.data?.members || [];
  const pagination = data?.data?.data?.pagination || {};
  const plans = plansData?.data?.data?.plans || [];

  const planOptions = plans.map(plan => ({
    value: plan.id,
    label: `${plan.planName} (${plan.planCode})`,
  }));

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      firstName: '',
      lastName: '',
      memberId: '',
      planId: '',
      status: 'ACTIVE',
      dateOfBirth: '',
    });
    setCurrentPage(1);
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to terminate this member? This action cannot be undone.')) {
      return;
    }

    try {
      await healthcareAPI.members.delete(memberId);
      toast.success('Member terminated successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to terminate member');
    }
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-danger-500 text-lg mb-4">
          Failed to load members: {apiHelpers.formatError(error)}
        </div>
        <Button onClick={refetch}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
            Members
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage healthcare plan members and their information
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Link to="/members/new">
            <Button variant="primary">
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Add Member
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Search & Filters</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="First Name"
                value={filters.firstName}
                onChange={(e) => handleFilterChange('firstName', e.target.value)}
                placeholder="Search by first name..."
              />
              <Input
                label="Last Name"
                value={filters.lastName}
                onChange={(e) => handleFilterChange('lastName', e.target.value)}
                placeholder="Search by last name..."
              />
              <Input
                label="Member ID"
                value={filters.memberId}
                onChange={(e) => handleFilterChange('memberId', e.target.value)}
                placeholder="Search by member ID..."
              />
              <Select
                label="Insurance Plan"
                value={filters.planId}
                onChange={(e) => handleFilterChange('planId', e.target.value)}
                options={planOptions}
                placeholder="All plans"
              />
              <Select
                label="Status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'TERMINATED', label: 'Terminated' },
                  { value: 'SUSPENDED', label: 'Suspended' },
                ]}
              />
              <Input
                label="Date of Birth"
                type="date"
                value={filters.dateOfBirth}
                onChange={(e) => handleFilterChange('dateOfBirth', e.target.value)}
              />
              <div className="flex items-end space-x-2 sm:col-span-2 lg:col-span-2">
                <Button variant="secondary" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Members Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Members ({pagination.total || 0})
              </h3>
              <p className="text-sm text-gray-500">
                Page {pagination.page || 1} of {pagination.totalPages || 1}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">Show:</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="input w-20"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              title="No members found"
              description="No members match your current search criteria."
              action={
                <Button variant="primary" onClick={clearFilters}>
                  Clear Filters
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>
                    <button
                      onClick={() => handleSort('memberId')}
                      className="flex items-center space-x-1 hover:text-healthcare-600"
                    >
                      <span>Member ID</span>
                      <SortIcon column="memberId" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <button
                      onClick={() => handleSort('firstName')}
                      className="flex items-center space-x-1 hover:text-healthcare-600"
                    >
                      <span>Name</span>
                      <SortIcon column="firstName" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </TableHeaderCell>
                  <TableHeaderCell>Date of Birth</TableHeaderCell>
                  <TableHeaderCell>Plan</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>
                    <button
                      onClick={() => handleSort('createdAt')}
                      className="flex items-center space-x-1 hover:text-healthcare-600"
                    >
                      <span>Enrolled</span>
                      <SortIcon column="createdAt" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="font-medium text-healthcare-600">
                        {member.memberId || member.member_id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">
                          {member.firstName || member.first_name} {member.lastName || member.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {apiHelpers.formatDate(member.dateOfBirth || member.date_of_birth)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {member.planName || member.plan_name || 'No Plan'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {member.planType || member.plan_type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={apiHelpers.getStatusColor(member.status)}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {apiHelpers.formatDate(member.createdAt || member.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/members/${member.id}`}
                          className="text-healthcare-600 hover:text-healthcare-900"
                        >
                          View
                        </Link>
                        <Link
                          to={`/members/${member.id}/edit`}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Edit
                        </Link>
                        {member.status !== 'TERMINATED' && (
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="text-danger-600 hover:text-danger-900"
                          >
                            Terminate
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
        {members.length > 0 && (
          <Pagination
            currentPage={pagination.page || 1}
            totalPages={pagination.totalPages || 1}
            onPageChange={setCurrentPage}
          />
        )}
      </Card>
    </div>
  );
};

// Sort Icon Component
const SortIcon = ({ column, sortBy, sortOrder }) => {
  if (sortBy !== column) {
    return (
      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  
  return sortOrder === 'asc' ? (
    <svg className="h-4 w-4 text-healthcare-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
    </svg>
  ) : (
    <svg className="h-4 w-4 text-healthcare-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
    </svg>
  );
};

const UserPlusIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
  </svg>
);

export default MembersPage;