import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Upload, Search, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CompoundsPage({ user }) {
  const [compounds, setCompounds] = useState([]);
  const [filteredCompounds, setFilteredCompounds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editingCompound, setEditingCompound] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    cas_number: '',
    solvent: 'Acetone',
    stock_value: 1000,
    stock_unit: 'mg',
    critical_value: 100,
    critical_unit: 'mg'
  });

  useEffect(() => {
    fetchCompounds();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = compounds.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.cas_number.includes(searchQuery)
      );
      setFilteredCompounds(filtered);
    } else {
      setFilteredCompounds(compounds);
    }
  }, [searchQuery, compounds]);

  const fetchCompounds = async () => {
    try {
      const response = await axios.get(`${API}/compounds`);
      setCompounds(response.data);
      setFilteredCompounds(response.data);
    } catch (error) {
      toast.error('Failed to load compounds');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCompound) {
        await axios.put(`${API}/compounds/${editingCompound.id}`, formData);
        toast.success('Compound updated successfully');
      } else {
        await axios.post(`${API}/compounds`, formData);
        toast.success('Compound created successfully');
      }
      fetchCompounds();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this compound?')) return;
    
    try {
      await axios.delete(`${API}/compounds/${id}`);
      toast.success('Compound deleted successfully');
      fetchCompounds();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Delete failed');
    }
  };

  const handleEdit = (compound) => {
    setEditingCompound(compound);
    setFormData({
      name: compound.name,
      cas_number: compound.cas_number,
      solvent: compound.solvent,
      stock_value: compound.stock_value,
      stock_unit: compound.stock_unit,
      critical_value: compound.critical_value,
      critical_unit: compound.critical_unit
    });
    setDialogOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/compounds/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Import completed: ${response.data.compounds_added} added, ${response.data.compounds_updated} updated`);
      fetchCompounds();
      setUploadDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cas_number: '',
      solvent: 'Acetone',
      stock_value: 1000,
      stock_unit: 'mg',
      critical_value: 100,
      critical_unit: 'mg'
    });
    setEditingCompound(null);
  };

  const solvents = [
    'Acetone', 'Acetonitrile', 'Methanol', 'Ethanol', 'Hexane', 'Cyclohexane',
    'Toluene', 'Dichloromethane', 'Chloroform', 'Ethyl Acetate', 'DMSO',
    'N,N-Dimethylformamide', 'Iso Propanol', 'Water', 'Heptane', 'Isooctane'
  ];

  const canEdit = user?.role !== 'readonly';
  const canDelete = user?.role === 'admin';

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="p-8" data-testid="compounds-page">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Compounds</h1>
            <p className="text-gray-600">Manage pesticide standards and chemicals</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="upload-excel-button" disabled={!canEdit}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Excel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Compounds from Excel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    data-testid="file-upload-input"
                  />
                  <p className="text-sm text-gray-500">
                    Upload an Excel file containing compound data (Name, CAS Number, Solvent)
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700" data-testid="add-compound-button" disabled={!canEdit}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Compound
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingCompound ? 'Edit Compound' : 'Add New Compound'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Compound Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g. Imidacloprid"
                        required
                        data-testid="compound-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CAS Number</Label>
                      <Input
                        value={formData.cas_number}
                        onChange={(e) => setFormData({...formData, cas_number: e.target.value})}
                        placeholder="e.g. 138261-41-3"
                        required
                        data-testid="compound-cas-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Solvent</Label>
                    <Select value={formData.solvent} onValueChange={(value) => setFormData({...formData, solvent: value})}>
                      <SelectTrigger data-testid="compound-solvent-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {solvents.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Stock Value</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.stock_value}
                        onChange={(e) => setFormData({...formData, stock_value: parseFloat(e.target.value)})}
                        required
                        data-testid="compound-stock-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Stock Unit</Label>
                      <Select value={formData.stock_unit} onValueChange={(value) => setFormData({...formData, stock_unit: value})}>
                        <SelectTrigger data-testid="compound-stock-unit-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mg">mg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="mL">mL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Critical Level</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.critical_value}
                        onChange={(e) => setFormData({...formData, critical_value: parseFloat(e.target.value)})}
                        required
                        data-testid="compound-critical-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Critical Unit</Label>
                      <Select value={formData.critical_unit} onValueChange={(value) => setFormData({...formData, critical_unit: value})}>
                        <SelectTrigger data-testid="compound-critical-unit-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mg">mg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="mL">mL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" data-testid="compound-submit-button">
                    {editingCompound ? 'Update Compound' : 'Create Compound'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by compound name or CAS number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="compound-search-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Compounds List */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Compounds List ({filteredCompounds.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Compound Name</th>
                    <th>CAS Number</th>
                    <th>Solvent</th>
                    <th>Stock</th>
                    <th>Critical Level</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompounds.map((compound) => (
                    <tr key={compound.id} data-testid={`compound-row-${compound.id}`}>
                      <td className="font-medium">{compound.name}</td>
                      <td className="font-mono text-sm">{compound.cas_number}</td>
                      <td className="text-sm">{compound.solvent}</td>
                      <td className={compound.stock_value <= compound.critical_value ? 'critical-stock' : ''}>
                        {compound.stock_value.toFixed(2)} {compound.stock_unit}
                      </td>
                      <td className="text-sm text-gray-600">
                        {compound.critical_value.toFixed(2)} {compound.critical_unit}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(compound)}
                            disabled={!canEdit}
                            data-testid={`edit-compound-${compound.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(compound.id)}
                            disabled={!canDelete}
                            data-testid={`delete-compound-${compound.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}