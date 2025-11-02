import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Scale, Beaker, QrCode, Check, ChevronsUpDown, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { toFixedSafe, pctSafe, parseNumeric } from '@/utils/number';

export default function WeighingPageEnhanced({ user }) {
  const [compounds, setCompounds] = useState([]);
  const [selectedCompound, setSelectedCompound] = useState(null);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  // Form inputs
  const [weighedAmount, setWeighedAmount] = useState('');
  const [purity, setPurity] = useState('100');
  const [targetConcentration, setTargetConcentration] = useState('');
  const [concentrationMode, setConcentrationMode] = useState('mg/L');
  const [temperature, setTemperature] = useState('25');
  const [solvent, setSolvent] = useState('');
  const [solventDensity, setSolventDensity] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [mixCode, setMixCode] = useState('');
  const [showMixCode, setShowMixCode] = useState(true);
  const [labelCode, setLabelCode] = useState('');
  const [labelCodeSource, setLabelCodeSource] = useState('auto');
  
  // Calculated outputs
  const [requiredVolume, setRequiredVolume] = useState('');
  const [requiredMass, setRequiredMass] = useState('');
  const [actualConcentration, setActualConcentration] = useState('');
  const [deviation, setDeviation] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showLabelDialog, setShowLabelDialog] = useState(false);

  useEffect(() => {
    fetchCompounds();
    // Set default prepared by to current user
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setPreparedBy(user.username || '');
    }
  }, []);

  useEffect(() => {
    if (selectedCompound && temperature && solvent) {
      calculateDensity();
    }
  }, [selectedCompound, temperature, solvent]);

  useEffect(() => {
    if (weighedAmount && purity && targetConcentration && solventDensity) {
      calculateResults();
    }
  }, [weighedAmount, purity, targetConcentration, concentrationMode, solventDensity]);

  const fetchCompounds = async () => {
    try {
      const response = await axios.get(`${API}/compounds`);
      setCompounds(response.data);
    } catch (error) {
      toast.error('Failed to load compounds');
    }
  };

  const searchCompounds = async (query) => {
    if (query.length < 2) {
      setCompounds([]);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/search/fuzzy`, {
        params: { q: query, limit: 50 }
      });
      setCompounds(response.data.compounds || []);
    } catch (error) {
      console.error('Search error:', error);
      setCompounds([]);
    }
  };

  const calculateDensity = async () => {
    try {
      const response = await axios.get(
        `${API}/calculate-density/${encodeURIComponent(solvent)}/${temperature}`
      );
      setSolventDensity(response.data.density_g_per_ml.toFixed(4));
    } catch (error) {
      setSolventDensity('0.8000');
    }
  };

  const calculateResults = () => {
    const weighed = parseNumeric(weighedAmount);
    const pur = parseNumeric(purity);
    const target = parseNumeric(targetConcentration);
    const density = parseNumeric(solventDensity);

    if (!weighed || !pur || !target || !density) return;

    // Calculate actual mass (corrected for purity)
    const actualMass = weighed * (pur / 100.0);

    let volume, mass, actualConc;

    if (concentrationMode === 'mg/L') {
      // w/v mode
      volume = actualMass / (target / 1000.0);
      mass = volume * density;
      actualConc = (actualMass / volume) * 1000.0;
    } else {
      // mg/kg (w/w) mode
      const actualMassG = actualMass / 1000.0;
      const targetFraction = target / 1000000.0;
      const totalMass = actualMassG / targetFraction;
      mass = totalMass - actualMassG;
      volume = mass / density;
      actualConc = (actualMassG / totalMass) * 1000000.0;
    }

    const dev = ((actualConc - target) / target) * 100.0;

    setRequiredVolume(volume.toFixed(3));
    setRequiredMass(mass.toFixed(3));
    setActualConcentration(actualConc.toFixed(3));
    setDeviation(dev.toFixed(2));
  };

  const handleCompoundSelect = (compoundId) => {
    const compound = compounds.find(c => c.id === compoundId);
    setSelectedCompound(compound);
    setSolvent(compound?.solvent || '');
    setOpen(false);
    setSearchValue('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompound) {
      toast.error('Please select a compound');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/weighing`, {
        compound_id: selectedCompound.id,
        weighed_amount: parseNumeric(weighedAmount),
        purity: parseNumeric(purity),
        target_concentration: parseNumeric(targetConcentration),
        concentration_mode: concentrationMode,
        temperature_c: parseNumeric(temperature),
        solvent: solvent,
        prepared_by: preparedBy,
        mix_code: mixCode || null,
        mix_code_show: showMixCode,
        label_code: labelCode || null,
        label_code_source: labelCodeSource
      });

      setResult(response.data);
      setShowLabelDialog(true);
      toast.success('Calculation saved and label generated!');
      
      // Reset form
      setWeighedAmount('');
      setPurity('100');
      setTargetConcentration('');
      setTemperature('25');
      setSelectedCompound(null);
      setSolvent('');
      setSolventDensity('');
      setRequiredVolume('');
      setRequiredMass('');
      setActualConcentration('');
      setDeviation('');
      
      fetchCompounds();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save calculation');
    } finally {
      setLoading(false);
    }
  };

  const filteredCompounds = compounds.filter(c => 
    c.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    c.cas_number.toLowerCase().includes(searchValue.toLowerCase())
  );

  const canCreate = user?.role !== 'readonly';

  return (
    <div className="p-8" data-testid="weighing-page">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Weighing & Analytical Calculation</h1>
          <p className="text-gray-600">Temperature-corrected solvent density and precise concentration calculation</p>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-green-600" />
              New Weighing Record
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Compound Selection */}
              <div className="space-y-2">
                <Label>Select Compound (searchable by name or CAS)</Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between"
                      disabled={!canCreate}
                      data-testid="weighing-compound-select"
                    >
                      {selectedCompound 
                        ? `${selectedCompound.name} (${selectedCompound.cas_number})`
                        : "Select a compound..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search by name or CAS..." 
                        value={searchValue}
                        onValueChange={setSearchValue}
                      />
                      <CommandEmpty>No compound found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {filteredCompounds.map((compound) => (
                          <CommandItem
                            key={compound.id}
                            value={compound.id}
                            onSelect={() => handleCompoundSelect(compound.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCompound?.id === compound.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{compound.name}</span>
                              <span className="text-xs text-gray-500">CAS: {compound.cas_number}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {selectedCompound && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">CAS Number:</p>
                      <p className="font-mono font-medium">{selectedCompound.cas_number}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Current Stock:</p>
                      <p className="font-semibold">
                        {toFixedSafe(selectedCompound.stock_value, 2)} {selectedCompound.stock_unit}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Solvent and Temperature */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Solvent (auto-filled)</Label>
                  <Input
                    placeholder="e.g. Acetone"
                    value={solvent}
                    onChange={(e) => setSolvent(e.target.value)}
                    disabled={!canCreate}
                    data-testid="weighing-solvent-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperature (°C)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="25.0"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    disabled={!canCreate}
                    data-testid="weighing-temperature-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Solvent Density ρ(T) (g/mL)</Label>
                  <Input
                    type="number"
                    value={solventDensity}
                    readOnly
                    className="bg-gray-100"
                    data-testid="weighing-density-display"
                  />
                </div>
              </div>

              {/* Weighing Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Weighed Amount (mg)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="e.g. 12.5"
                    value={weighedAmount}
                    onChange={(e) => setWeighedAmount(e.target.value)}
                    required
                    disabled={!canCreate}
                    data-testid="weighing-amount-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purity (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="100.0"
                    value={purity}
                    onChange={(e) => setPurity(e.target.value)}
                    required
                    disabled={!canCreate}
                    data-testid="weighing-purity-input"
                  />
                </div>
              </div>

              {/* Target Concentration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Concentration (ppm)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="e.g. 1000"
                    value={targetConcentration}
                    onChange={(e) => setTargetConcentration(e.target.value)}
                    required
                    disabled={!canCreate}
                    data-testid="weighing-target-concentration-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Concentration Mode</Label>
                  <Select value={concentrationMode} onValueChange={setConcentrationMode} disabled={!canCreate}>
                    <SelectTrigger data-testid="weighing-concentration-mode-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mg/L">mg/L (w/v)</SelectItem>
                      <SelectItem value="mg/kg">mg/kg (w/w)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Calculated Results */}
              {requiredVolume && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-3">Calculated Results</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Required Volume:</p>
                      <p className="text-xl font-bold text-green-700">{requiredVolume} mL</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Required Solvent Mass:</p>
                      <p className="text-xl font-bold text-green-700">{requiredMass} g</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Actual Concentration:</p>
                      <p className="text-lg font-semibold">{actualConcentration} ppm</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Deviation:</p>
                      <p className={`text-lg font-semibold ${Math.abs(parseFloat(deviation)) > 1 ? 'text-red-600' : 'text-green-600'}`}>
                        {deviation}%
                      </p>
                    </div>
                  </div>
                  {Math.abs(parseFloat(deviation)) > 1 && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-orange-600">
                      <AlertCircle className="w-4 h-4" />
                      <span>Deviation exceeds 1% - verify calculations</span>
                    </div>
                  )}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg font-semibold"
                disabled={loading || !canCreate || !requiredVolume}
                data-testid="weighing-submit-button"
              >
                {loading ? (
                  'Processing...'
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Beaker className="w-5 h-5" />
                    Save Calculation & Generate Label
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Label Preview Dialog */}
        {result && (
          <Dialog open={showLabelDialog} onOpenChange={setShowLabelDialog}>
            <DialogContent className="max-w-3xl" data-testid="label-dialog">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-green-600" />
                  Label Generated Successfully
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Calculation Summary */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-3">Calculation Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Actual Concentration:</p>
                      <p className="text-xl font-bold text-green-700">
                        {toFixedSafe(result.usage.actual_concentration, 3)} ppm
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Required Volume:</p>
                      <p className="text-lg font-semibold">
                        {toFixedSafe(result.usage.required_volume, 3)} mL
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Label Code:</p>
                      <p className="text-lg font-mono font-bold text-blue-600">{result.label.label_code}</p>
                    </div>
                  </div>
                </div>

                {/* Label Preview */}
                <div className="border-2 border-gray-300 rounded-lg p-6" style={{
                  width: '70mm',
                  height: '25mm',
                  margin: '0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: 'white'
                }}>
                  <div>
                    <p className="font-bold text-xs uppercase" style={{ fontSize: '8pt' }}>
                      {result.label.compound_name}
                    </p>
                    <p className="text-xs" style={{ fontSize: '6pt' }}>
                      CAS: {result.label.cas_number} • Conc.: {result.label.concentration}
                    </p>
                    <p className="text-xs" style={{ fontSize: '6pt' }}>
                      Date: {result.label.date} • Prepared by: {result.label.prepared_by}
                    </p>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="font-mono font-bold text-xs" style={{ fontSize: '7pt' }}>
                      Code: {result.label.label_code}
                    </p>
                    <div className="flex gap-2">
                      <img 
                        src={`data:image/png;base64,${result.qr_code}`} 
                        alt="QR Code" 
                        className="w-12 h-12"
                      />
                      <img 
                        src={`data:image/png;base64,${result.barcode}`} 
                        alt="Barcode" 
                        className="h-12"
                        style={{ width: 'auto' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => window.print()}
                    data-testid="print-label-button"
                  >
                    Print Label
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowLabelDialog(false)}
                    data-testid="close-label-dialog"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
