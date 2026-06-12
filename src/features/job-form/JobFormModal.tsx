import { useState } from 'react';
import {
  Briefcase,
  Code,
  DollarSign,
  Tag,
  Save
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input, Textarea, Select } from '../../components/ui/input';
import { Modal } from '../../components/ui/modal';
import type { Job } from '../../types';
import type { JobCreate, JobUpdate } from '../../types';

interface JobFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: JobCreate | JobUpdate) => Promise<void>;
  job?: Job;
  isLoading: boolean;
  title?: string;
}

export function JobFormModal({
  isOpen,
  onClose,
  onSave,
  job,
  isLoading,
  title
}: JobFormProps) {
  const [formData, setFormData] = useState({
    role: job?.role || '',
    department: job?.department || 'General',
    location: job?.location || 'Remote',
    type: job?.type || 'full-time',
    required_skills: job?.required_skills || '',
    min_experience: job?.min_experience || 0,
    salary_min: job?.salary_min?.toString() || '',
    salary_max: job?.salary_max?.toString() || '',
    description: job?.description || '',
    status: job?.status || 'draft'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'min_experience' ? parseInt(value) || 0 : value
    }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.role.trim()) newErrors.role = 'Role is required';
    if (!formData.required_skills.trim()) newErrors.required_skills = 'Required skills are required';
    if (formData.min_experience < 0) newErrors.min_experience = 'Experience must be positive';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const data: JobCreate = {
      role: formData.role,
      required_skills: formData.required_skills,
      min_experience: formData.min_experience
    };
    await onSave(data);
  };

  const handleClose = () => { setErrors({}); onClose(); };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title || (job ? 'Edit Job' : 'Create New Job')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4" />Basic Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Job Title" name="role" value={formData.role} onChange={handleChange} placeholder="e.g. Senior Software Engineer" error={errors.role} required />
            <Select label="Department" name="department" value={formData.department} onChange={handleChange} options={[{ value: 'General', label: 'General' }, { value: 'Engineering', label: 'Engineering' }, { value: 'Product', label: 'Product' }, { value: 'Design', label: 'Design' }, { value: 'Marketing', label: 'Marketing' }, { value: 'Sales', label: 'Sales' }]} />
            <Input label="Location" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. San Francisco, CA (Remote)" />
            <Select label="Employment Type" name="type" value={formData.type} onChange={handleChange} options={[{ value: 'full-time', label: 'Full-time' }, { value: 'part-time', label: 'Part-time' }, { value: 'contract', label: 'Contract' }, { value: 'internship', label: 'Internship' }]} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Code className="w-4 h-4" />Requirements</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Required Skills" name="required_skills" value={formData.required_skills} onChange={handleChange} placeholder="e.g. React, TypeScript, Node.js" error={errors.required_skills} helperText="Comma-separated skills" required />
            <Input label="Min. Experience (years)" name="min_experience" type="number" value={formData.min_experience} onChange={handleChange} error={errors.min_experience} required />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4" />Compensation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Minimum Salary" name="salary_min" value={formData.salary_min} onChange={handleChange} placeholder="e.g. 120000" />
            <Input label="Maximum Salary" name="salary_max" value={formData.salary_max} onChange={handleChange} placeholder="e.g. 180000" />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Tag className="w-4 h-4" />Description</h3>
          <Textarea name="description" value={formData.description} onChange={handleChange} placeholder="Add a detailed job description..." rows={5} />
        </div>
        <Select label="Status" name="status" value={formData.status} onChange={handleChange} options={[{ value: 'draft', label: 'Draft' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }, { value: 'archived', label: 'Archived' }]} />
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={handleClose} type="button">Cancel</Button>
          <Button type="submit" isLoading={isLoading} leftIcon={<Save className="w-4 h-4" />}>{job ? 'Save Changes' : 'Create Job'}</Button>
        </div>
      </form>
    </Modal>
  );
}
