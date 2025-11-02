import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, FileText, Tag, FileSpreadsheet, FileImage } from 'lucide-react';
import { toast } from 'sonner';
import { toFixedSafe, pctSafe } from '@/utils/number';

export default function RecordsPage() {
  const [usages, setUsages] = useState([]);
  const [labels, setLabels] = useState([]);
  const [compounds, setCompounds] = useState([]);
  const [filteredUsages, setFilteredUsages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompound, setFilterCompound] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterCompound, usages]);

  const fetchData = async () => {
    try {
      // Use the new weighings endpoint that returns envelope format
      const weighingsResponse = await axios.get(`${API}/weighings`);
      const labelsResponse = await axios.get(`${API}/labels`);
      const compoundsResponse = await axios.get(`${API}/compounds`);
      
      // Handle envelope format from weighings endpoint
      const usagesData = weighingsResponse.data?.data || [];
      const labelsData = labelsResponse.data?.data || labelsResponse.data || [];
      const compoundsData = compoundsResponse.data?.data || compoundsResponse.data || [];
      
      setUsages(Array.isArray(usagesData) ? usagesData : []);
      setLabels(Array.isArray(labelsData) ? labelsData : []);
      setCompounds(Array.isArray(compoundsData) ? compoundsData : []);
      setFilteredUsages(Array.isArray(usagesData) ? usagesData : []);
      
      console.log('Records loaded:', {
        usages: usagesData.length,
        labels: labelsData.length,
        compounds: compoundsData.length
      });
    } catch (error) {
      console.error('Failed to load records:', error);
      toast.error('Failed to load records. Please refresh the page.');
      // Set empty arrays to prevent crashes
      setUsages([]);
      setLabels([]);
      setCompounds([]);
      setFilteredUsages([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = Array.isArray(usages) ? [...usages] : [];

    if (searchQuery) {
      filtered = filtered.filter(u => 
        (u.compound_name && u.compound_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.cas_number && u.cas_number.includes(searchQuery)) ||
        (u.prepared_by && u.prepared_by.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (filterCompound !== 'all') {
      filtered = filtered.filter(u => u.compound_id === filterCompound);
    }

    setFilteredUsages(filtered);
  };

  const exportToCSV = (data, filename) => {
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  };

  const handleExportUsages = () => {
    const params = new URLSearchParams();
    if (filterCompound !== 'all') params.append('compound_id', filterCompound);
    if (searchQuery) params.append('search_query', searchQuery);
    
    const token = localStorage.getItem('token');
    const url = `${API}/weighings/export.xlsx?${params.toString()}`;
    
    // Create temporary link to download with auth header
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WeighingRecords_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Weighing records exported successfully');
    })
    .catch(error => {
      console.error('Export error:', error);
      toast.error('Failed to export weighing records');
    });
  };

  const handleExportLabels = () => {
    exportToCSV(labels, 'labels.csv');
    toast.success('Labels exported successfully');
  };

  const handleExportLabelsPDF = () => {
    const params = new URLSearchParams();
    if (filterCompound !== 'all') params.append('compound_id', filterCompound);
    if (searchQuery) params.append('search_query', searchQuery);
    
    const token = localStorage.getItem('token');
    const url = `${API}/labels/export.pdf?${params.toString()}`;
    
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Labels_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Labels exported as PDF successfully');
    })
    .catch(error => {
      console.error('Export error:', error);
      toast.error('Failed to export labels as PDF');
    });
  };

  const handleExportLabelsDOCX = () => {
    const params = new URLSearchParams();
    if (filterCompound !== 'all') params.append('compound_id', filterCompound);
    if (searchQuery) params.append('search_query', searchQuery);
    
    const token = localStorage.getItem('token');
    const url = `${API}/labels/export.docx?${params.toString()}`;
    
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Labels_${new Date().toISOString().slice(0,10)}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Labels exported as Word document successfully');
    })
    .catch(error => {
      console.error('Export error:', error);
      toast.error('Failed to export labels as Word document');
    });
  };

  const handleExportLabelsDOCXZip = () => {
    const params = new URLSearchParams();
    if (filterCompound !== 'all') params.append('compound_id', filterCompound);
    if (searchQuery) params.append('search_query', searchQuery);
    
    const token = localStorage.getItem('token');
    const url = `${API}/labels/export-docx.zip?${params.toString()}`;
    
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Labels_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Labels exported as ZIP successfully');
    })
    .catch(error => {
      console.error('Export error:', error);
      toast.error('Failed to export labels as ZIP');
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="p-8" data-testid="records-page">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Records & Reports</h1>
            <p className="text-gray-600">View and export weighing records and labels</p>
          </div>
        </div>

        <Tabs defaultValue="usages" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="usages" data-testid="tab-usages">
              <FileText className="w-4 h-4 mr-2" />
              Weighing Records
            </TabsTrigger>
            <TabsTrigger value="labels" data-testid="tab-labels">
              <Tag className="w-4 h-4 mr-2" />
              Labels
            </TabsTrigger>
          </TabsList>

          {/* Weighing Records Tab */}
          <TabsContent value="usages" className="space-y-6">
            {/* Filters */}
            <Card className="shadow-soft">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Search by compound, CAS, or user..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="records-search-input"
                    />
                  </div>
                  <Select value={filterCompound} onValueChange={setFilterCompound}>
                    <SelectTrigger data-testid="records-filter-select">
                      <SelectValue placeholder="Filter by compound" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Compounds</SelectItem>
                      {compounds.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Records Table */}
            <Card className="shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Weighing Records ({filteredUsages.length})</CardTitle>
                <Button
                  onClick={handleExportUsages}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="export-usages-button"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Compound</th>
                        <th>CAS Number</th>
                        <th>Weighed (mg)</th>
                        <th>Purity (%)</th>
                        <th>Target (ppm)</th>
                        <th>Req. Volume (mL)</th>
                        <th>Actual (ppm)</th>
                        <th>Deviation (%)</th>
                        <th>Temperature (°C)</th>
                        <th>Density (g/mL)</th>
                        <th>Prepared By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsages.length > 0 ? (
                        filteredUsages.map((usage) => (
                          <tr key={usage.id} data-testid={`usage-row-${usage.id}`}>
                            <td className="text-sm">
                              {new Date(usage.created_at).toLocaleDateString()}
                            </td>
                            <td className="font-medium">{usage.compound_name}</td>
                            <td className="font-mono text-sm">{usage.cas_number}</td>
                            <td>{toFixedSafe(usage.weighed_amount, 2)}</td>
                            <td>{toFixedSafe(usage.purity, 1)}%</td>
                            <td>{toFixedSafe(usage.target_concentration, 2)}</td>
                            <td>{toFixedSafe(usage.required_volume, 3)}</td>
                            <td className="font-semibold text-green-600">
                              {toFixedSafe(usage.actual_concentration, 3)}
                            </td>
                            <td className={Math.abs(usage.deviation || 0) > 1 ? 'text-red-600' : 'text-green-600'}>
                              {pctSafe(usage.deviation, 2)}
                            </td>
                            <td>{toFixedSafe(usage.temperature_c, 1)}</td>
                            <td>{toFixedSafe(usage.solvent_density, 4)}</td>
                            <td>{usage.prepared_by}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="12" className="text-center text-gray-500 py-8">
                            No records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Labels Tab */}
          <TabsContent value="labels" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Labels ({labels.length})</CardTitle>
                <Button
                  onClick={handleExportLabels}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="export-labels-button"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Label Code</th>
                        <th>Compound</th>
                        <th>CAS Number</th>
                        <th>Concentration</th>
                        <th>Prepared By</th>
                        <th>QR Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labels.length > 0 ? (
                        labels.map((label) => (
                          <tr key={label.id} data-testid={`label-row-${label.id}`}>
                            <td className="text-sm">{label.date}</td>
                            <td className="font-mono font-bold text-blue-600">{label.label_code}</td>
                            <td className="font-medium">{label.compound_name}</td>
                            <td className="font-mono text-sm">{label.cas_number}</td>
                            <td className="font-semibold text-green-600">{label.concentration}</td>
                            <td>{label.prepared_by}</td>
                            <td className="text-xs font-mono max-w-xs truncate" title={label.qr_data}>
                              {label.qr_data}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center text-gray-500 py-8">
                            No labels found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}