"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, DefaultValues } from 'react-hook-form';
import { z } from 'zod';
import { createDraft, updateTripReport } from '@/app/actions';
import { toast } from 'sonner';

// MVP Schema steps
const Step1Schema = z.object({
  sessionDate: z.string().min(1, "Date is required"),
  psychedelicType: z.enum(['Mushroom', 'LSD']),
});

const Step2MushroomSchema = z.object({
  dosageGrams: z.number().positive("Must be a positive number").optional().or(z.literal('')),
  mushroomStrain: z.enum(['Thai Lipa Noi', 'Tasmanian', 'Golden Teacher', 'Cambodian', 'Mexicana', '']).optional(),
  intakeMethod: z.enum(['прямое использование', 'измельченное использование', 'lemon tek lemon', 'lemon tek acid', 'грибной чай из сухих', 'грибной чай из подсушенных', 'грибной чай из сухих грибов', 'грибной чай из свежих', '']).optional(),
  location: z.enum(['дома', 'на природе', 'event', 'в гостях', '']).optional(),
  socialFactor: z.enum(['один', 'с другом', 'с девушкой', 'три и более', '']).optional(),
  intakeTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid time HH:MM").optional().or(z.literal('')),
});

const Step2LSDSchema = z.object({}); // For future extension

const Step3Schema = z.object({
  lastMealHoursAgo: z.number().min(0).optional().or(z.literal('')),
  mealDescription: z.string().optional(),
});

const Step4Schema = z.object({
  firstEffectsMinutes: z.number().positive().optional().or(z.literal('')),
  firstEffectsActivity: z.enum(['играл', 'был за компьютером', 'слушал музыку сидя', 'слушал музыку лежа', 'занимался делами', 'смотрел кино', 'смотрел YouTube', 'общался по интернету', 'общался лично', 'занятие творчеством', 'медитация', '']).optional(),
});

const Step5Schema = z.object({
  notes: z.string().optional(),
});

// Full form payload interface
type FormPayload = z.infer<typeof Step1Schema> & 
  z.infer<typeof Step2MushroomSchema> & 
  z.infer<typeof Step3Schema> & 
  z.infer<typeof Step4Schema> & 
  z.infer<typeof Step5Schema>;

export default function TripForm({ initialData, reportId }: { initialData?: any, reportId?: string }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(initialData?.currentStep || 1);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize values
  const defaultValues: any = {
    sessionDate: initialData?.sessionDate ? new Date(initialData.sessionDate).toISOString().split('T')[0] : '',
    psychedelicType: initialData?.psychedelicType || '',
    dosageGrams: initialData?.dosageGrams || '',
    mushroomStrain: initialData?.mushroomStrain || '',
    intakeMethod: initialData?.intakeMethod || '',
    location: initialData?.location || '',
    socialFactor: initialData?.socialFactor || '',
    intakeTime: initialData?.intakeTime || '',
    lastMealHoursAgo: initialData?.lastMealHoursAgo || '',
    mealDescription: initialData?.mealDescription || '',
    firstEffectsMinutes: initialData?.firstEffectsMinutes || '',
    firstEffectsActivity: initialData?.firstEffectsActivity || '',
    notes: initialData?.notes || '',
    ...(initialData?.formPayload ? JSON.parse(initialData.formPayload) : {}),
  };

  const { register, handleSubmit, watch, trigger, getValues, formState: { errors } } = useForm<FormPayload>({
    defaultValues,
    mode: 'onTouched'
  });

  const psychedelicType = watch('psychedelicType');

  // Debounced auto-save effect
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      // We only want to save if there's actual data input underway
      const handler = setTimeout(() => {
        if (reportId && !isSaving) {
          autoSaveDraft(currentStep);
          toast.success("Draft auto-saved", { position: 'bottom-right' });
        }
      }, 2000);
      return () => clearTimeout(handler);
    });
    return () => subscription.unsubscribe();
  }, [watch, currentStep, reportId]);

  // Determine current active schema for validation when moving to next step
  const getStepFields = (step: number) => {
    switch(step) {
      case 1: return ['sessionDate', 'psychedelicType'];
      case 2: return ['dosageGrams', 'mushroomStrain', 'intakeMethod', 'location', 'socialFactor', 'intakeTime']; 
      case 3: return ['lastMealHoursAgo', 'mealDescription'];
      case 4: return ['firstEffectsMinutes', 'firstEffectsActivity'];
      case 5: return ['notes'];
      default: return [];
    }
  };

  const getMaxSteps = () => {
    // Currently 5 steps for Mushroom, 2 for LSD (placeholder)
    return psychedelicType === 'Mushroom' ? 5 : psychedelicType === 'LSD' ? 5 : 5;
  };

  const handleNext = async () => {
    const fieldsToValidate = getStepFields(currentStep) as any[];
    const isValid = await trigger(fieldsToValidate);
    
    if (isValid && currentStep < getMaxSteps()) {
      setCurrentStep((s: number) => s + 1);
      // Auto save draft logic could go here
      autoSaveDraft(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep((s: number) => s - 1);
  };

  const constructPayload = (data: any) => {
    return {
      sessionDate: data.sessionDate ? new Date(data.sessionDate) : null,
      psychedelicType: data.psychedelicType,
      dosageGrams: data.dosageGrams !== '' ? Number(data.dosageGrams) : null,
      mushroomStrain: data.mushroomStrain,
      intakeMethod: data.intakeMethod,
      location: data.location,
      socialFactor: data.socialFactor,
      intakeTime: data.intakeTime,
      lastMealHoursAgo: data.lastMealHoursAgo !== '' ? Number(data.lastMealHoursAgo) : null,
      mealDescription: data.mealDescription,
      firstEffectsMinutes: data.firstEffectsMinutes !== '' ? Number(data.firstEffectsMinutes) : null,
      firstEffectsActivity: data.firstEffectsActivity,
      notes: data.notes,
      formPayload: {}, // remaining unstructured
      currentStep,
    };
  };

  const autoSaveDraft = async (step: number) => {
    if (isSaving) return;
    const data = getValues();
    const payload = constructPayload(data);
    payload.currentStep = step;
    
    try {
      if (reportId) {
        await updateTripReport(reportId, payload, false);
      } else {
        // Create new draft quietly
        // If we create multiple, we might want to track ID... doing simple redirect or state update
      }
    } catch(e) { }
  };

  const onFinalSave = async (data: FormPayload) => {
    setIsSaving(true);
    const payload = constructPayload(data);
    
    try {
      if (reportId) {
        await updateTripReport(reportId, payload, true);
      } else {
        const result = await createDraft(payload);
        await updateTripReport(result.id, payload, true);
      }
      router.push('/');
      toast.success("Trip Report Saved");
    } catch (e) {
      toast.error('Error saving report');
    } finally {
      setIsSaving(false);
    }
  };

  const onSaveDraft = async () => {
    setIsSaving(true);
    const payload = constructPayload(getValues());
    try {
      if (reportId) {
        await updateTripReport(reportId, payload, false);
      } else {
        await createDraft(payload);
      }
      toast.success("Draft Saved Successfully");
      router.push('/');
    } catch(e) {
      toast.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const ErrorMsg = ({ field }: { field: string }) => {
    const error = (errors as any)[field];
    return error ? <p className="error-text">{error.message}</p> : null;
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Step {currentStep} of {getMaxSteps()}</h2>
        <div style={{ background: 'var(--secondary)', height: '8px', width: '200px', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ background: 'var(--accent)', height: '100%', width: `${(currentStep / getMaxSteps()) * 100}%`, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      <form onSubmit={(e) => {
        if (currentStep < getMaxSteps()) {
          e.preventDefault();
          handleNext();
        } else {
          handleSubmit(onFinalSave)(e);
        }
      }}>
        
        {/* STEP 1 */}
        <div className="step-container" style={{ display: currentStep === 1 ? 'block' : 'none', opacity: currentStep === 1 ? 1 : 0 }}>
          <div className="form-group">
            <label className="form-label">Session Date</label>
            <input type="date" className="form-input" {...register('sessionDate')} />
            <ErrorMsg field="sessionDate" />
          </div>

          <div className="form-group">
            <label className="form-label">Psychedelic Type</label>
            <select className="form-input" {...register('psychedelicType')}>
              <option value="">Select an option</option>
              <option value="Mushroom">Mushroom</option>
              <option value="LSD">LSD</option>
            </select>
            <ErrorMsg field="psychedelicType" />
          </div>
        </div>

        {/* STEP 2 - Mushroom */}
        <div className="step-container" style={{ display: currentStep === 2 ? 'block' : 'none', opacity: currentStep === 2 ? 1 : 0 }}>
          {psychedelicType === 'Mushroom' ? (
            <>
              <div className="form-group">
                <label className="form-label">Dosage (Grams)</label>
                <input type="number" step="0.1" className="form-input" {...register('dosageGrams', { valueAsNumber: true })} />
                <ErrorMsg field="dosageGrams" />
              </div>
              <div className="form-group">
                <label className="form-label">Strain</label>
                <select className="form-input" {...register('mushroomStrain')}>
                  <option value="">Select an option</option>
                  {['Thai Lipa Noi', 'Tasmanian', 'Golden Teacher', 'Cambodian', 'Mexicana'].map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Intake Method</label>
                <select className="form-input" {...register('intakeMethod')}>
                  <option value="">Select an option</option>
                  {['прямое использование', 'измельченное использование', 'lemon tek lemon', 'lemon tek acid', 'грибной чай из сухих', 'грибной чай из подсушенных', 'грибной чай из сухих грибов', 'грибной чай из свежих'].map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <select className="form-input" {...register('location')}>
                  <option value="">Select an option</option>
                  {['дома', 'на природе', 'event', 'в гостях'].map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Social Factor</label>
                <select className="form-input" {...register('socialFactor')}>
                  <option value="">Select an option</option>
                  {['один', 'с другом', 'с девушкой', 'три и более'].map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Intake Time (HH:MM)</label>
                <input type="text" placeholder="14:30" className="form-input" {...register('intakeTime')} />
                <ErrorMsg field="intakeTime" />
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--muted)' }}>LSD Extension placeholder. Click next.</p>
          )}
        </div>

        {/* STEP 3 */}
        <div className="step-container" style={{ display: currentStep === 3 ? 'block' : 'none', opacity: currentStep === 3 ? 1 : 0 }}>
          <div className="form-group">
            <label className="form-label">Last meal (hours ago)</label>
            <input type="number" className="form-input" {...register('lastMealHoursAgo', { valueAsNumber: true })} />
            <ErrorMsg field="lastMealHoursAgo" />
          </div>
          <div className="form-group">
            <label className="form-label">What did you eat?</label>
            <textarea className="form-input" rows={3} {...register('mealDescription')} />
          </div>
        </div>

         {/* STEP 4 */}
         <div className="step-container" style={{ display: currentStep === 4 ? 'block' : 'none', opacity: currentStep === 4 ? 1 : 0 }}>
           <div className="form-group">
            <label className="form-label">Time until first effects (minutes)</label>
            <input type="number" className="form-input" {...register('firstEffectsMinutes', { valueAsNumber: true })} />
            <ErrorMsg field="firstEffectsMinutes" />
          </div>
          <div className="form-group">
            <label className="form-label">Activity during first effects</label>
            <select className="form-input" {...register('firstEffectsActivity')}>
              <option value="">Select an option</option>
              {['играл', 'был за компьютером', 'слушал музыку сидя', 'слушал музыку лежа', 'занимался делами', 'смотрел кино', 'смотрел YouTube', 'общался по интернету', 'общался лично', 'занятие творчеством', 'медитация'].map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* STEP 5 */}
        <div className="step-container" style={{ display: currentStep === 5 ? 'block' : 'none', opacity: currentStep === 5 ? 1 : 0 }}>
          <div className="form-group">
            <label className="form-label">Notes & Full Report</label>
            <textarea className="form-input" rows={8} {...register('notes')} placeholder="Describe your experience..." />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <div>
             <button type="button" className="btn" onClick={onSaveDraft} disabled={isSaving} style={{ marginRight: '1rem' }}>
              Save Draft
            </button>
            {currentStep > 1 && (
              <button type="button" className="btn" onClick={handlePrev} disabled={isSaving}>
                Previous
              </button>
            )}
          </div>
          
          <div>
            {currentStep < getMaxSteps() ? (
              <button type="button" className="btn btn-primary" onClick={handleNext} disabled={isSaving || !psychedelicType}>
                Next Step
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Finish & Save Active'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
