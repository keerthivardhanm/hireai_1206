import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Code,
  DollarSign,
  Tag,
  Save
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input, Textarea, Select } from '../../components/ui/input';
import { Modal } from '../../components/ui/modal';
import { Chip } from '../../components/ui/badge';
import type { Candidate, Job } from '../../types';
import type { CandidateCreate, CandidateUpdate } from '../../types';

interface CandidateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CandidateCreate | CandidateUpdate) => Promise<void>;
  candidate?: Candidate;
  jobs: Job[];
  isLoading: boolean;
  title?: string;
}

export function CandidateFormModal({
  isOpen,
  onClose,
  onSave,
  candidate,
  jobs,
  isLoading,
  title
}: CandidateFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    skills: '',
    experience_years: 0,
    education: '',
    projects: '',
    expected_salary: '',
    source: '',
    notes: '',
    status: 'applied',
    job_id: '',
    tagInput: '',
    tags: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when candidate changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: candidate?.name || '',
        email: candidate?.email || '',
        phone: candidate?.phone || '',
        location: candidate?.location || '',
        skills: candidate?.skills || '',
        experience_years: candidate?.experience_years || 0,
        education: candidate?.education || '',
        projects: candidate?.projects || '',
        expected_salary: candidate?.expected_salary?.toString() || '',
        source: candidate?.source || '',
        notes: candidate?.notes || '',
        status: candidate?.status || 'applied',
        job_id: '',
        tagInput: '',
        tags: candidate?.tags || []
      });
      setErrors({});
    }
  }, [candidate, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'experience_years' ? parseInt(value) || 0 : value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleAddTag = () => {
    if (formData.tagInput.trim() && !formData.tags.includes(formData.tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, prev.tagInput.trim()], tagInput: '' }));
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.skills.trim()) newErrors.skills = 'Skills are required';
    if (formData.experience_years < 0) newErrors.experience_years = 'Experience must be positive';
    if (!formData.education.trim()) newErrors.education = 'Education is required';
    if (!formData.projects.trim()) newErrors.projects = 'Projects are required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (candidate) {
      // Update existing candidate
      await onSave({
        name: formData.name,
        email: formData.email,
        skills: formData.skills,
        experience_years: formData.experience_years,
        education: formData.education,
        projects: formData.projects
      });
    } else {
      // Create new candidate
      await onSave({
        name: formData.name,
        email: formData.email,
        skills: formData.skills,
        experience_years: formData.experience_years,
        education: formData.education,
        projects: formData.projects
      });
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title || (candidate ? 'Edit Candidate' : 'Add New Candidate')} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><User className="w-4 h-4" />Personal Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" error={errors.name} required />
            <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" error={errors.email} leftIcon={<Mail className="w-4 h-4" />} required />
            <Input label="Phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 (555) 123-4567" leftIcon={<Phone className="w-4 h-4" />} />
            <Input label="Location" name="location" value={formData.location} onChange={handleChange} placeholder="San Francisco, CA" leftIcon={<MapPin className="w-4 h-4" />} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4" />Professional Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Skills" name="skills" value={formData.skills} onChange={handleChange} placeholder="React, TypeScript, Node.js" error={errors.skills} helperText="Comma-separated skills" leftIcon={<Code className="w-4 h-4" />} required />
            <Input label="Experience (years)" name="experience_years" type="number" value={formData.experience_years} onChange={handleChange} error={errors.experience_years} leftIcon={<Briefcase className="w-4 h-4" />} required />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><GraduationCap className="w-4 h-4" />Education</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Education" name="education" value={formData.education} onChange={handleChange} placeholder="MS Computer Science, Stanford" error={errors.education} required />
            <Input label="Projects" name="projects" value={formData.projects} onChange={handleChange} placeholder="E-commerce platform, AI chatbot" error={errors.projects} helperText="Comma-separated projects" required />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Tag className="w-4 h-4" />Additional Info</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Assign to Job" name="job_id" value={formData.job_id} onChange={handleChange} options={[{ value: '', label: 'Select a job (optional)' }, ...jobs.map(j => ({ value: String(j.job_id), label: j.role }))]} />
            <Select label="Status" name="status" value={formData.status} onChange={handleChange} options={[{ value: 'applied', label: 'Applied' }, { value: 'shortlisted', label: 'Shortlisted' }, { value: 'interviewed', label: 'Interviewed' }, { value: 'offered', label: 'Offered' }, { value: 'hired', label: 'Hired' }, { value: 'rejected', label: 'Rejected' }]} />
            <Input label="Expected Salary" name="expected_salary" value={formData.expected_salary} onChange={handleChange} placeholder="$120,000" leftIcon={<DollarSign className="w-4 h-4" />} />
            <Input label="Source" name="source" value={formData.source} onChange={handleChange} placeholder="LinkedIn, Referral, etc." />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
          <div className="flex gap-2 flex-wrap mb-2">{formData.tags.map(tag => <Chip key={tag} onRemove={() => handleRemoveTag(tag)} variant="info">{tag}</Chip>)}</div>
          <div className="flex gap-2">
            <input type="text" value={formData.tagInput} onChange={(e) => setFormData(prev => ({ ...prev, tagInput: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} placeholder="Add a tag..." className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <Button variant="secondary" onClick={handleAddTag} type="button">Add</Button>
          </div>
        </div>
        <Textarea label="Notes" name="notes" value={formData.notes} onChange={handleChange} placeholder="Add any notes about this candidate..." rows={3} />
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={handleClose} type="button">Cancel</Button>
          <Button type="submit" isLoading={isLoading} leftIcon={<Save className="w-4 h-4" />}>{candidate ? 'Save Changes' : 'Add Candidate'}</Button>
        </div>
      </form>
    </Modal>
  );
}
