"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useShiftsFilters } from "@/contexts/shifts-context";

export default function CustomPeriodSelector() {
  const { setRangeType, setAnchorDate } = useShiftsFilters();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Función para validar si una fecha es válida
  const isValidDate = (dateStr: string) => {
    if (!dateStr || dateStr.length < 5) return true; // No validar si está incompleto
    
    const parts = dateStr.split('/');
    if (parts.length !== 2) return false;
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    
    if (isNaN(day) || isNaN(month)) return false;
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    
    // Validar días específicos por mes
    const currentYear = new Date().getFullYear();
    const testDate = new Date(currentYear, month - 1, day);
    
    return testDate.getDate() === day && testDate.getMonth() === month - 1;
  };

  // Estados de validación
  const isStartDateValid = isValidDate(startDate);
  const isEndDateValid = isValidDate(endDate);

  // Función para validar y formatear la entrada
  const handleDateInput = (value: string, setter: (val: string) => void) => {
    // Remover cualquier caracter que no sea número o /
    let cleaned = value.replace(/[^\d/]/g, '');
    
    // Si hay más de una /, mantener solo la primera
    const slashCount = (cleaned.match(/\//g) || []).length;
    if (slashCount > 1) {
      const firstSlashIndex = cleaned.indexOf('/');
      cleaned = cleaned.substring(0, firstSlashIndex + 1) + cleaned.substring(firstSlashIndex + 1).replace(/\//g, '');
    }
    
    // Auto-agregar / después de 2 dígitos si no existe
    if (cleaned.length === 2 && !cleaned.includes('/')) {
      cleaned += '/';
    }
    
    // Limitar a 5 caracteres máximo (DD/MM)
    if (cleaned.length > 5) {
      cleaned = cleaned.substring(0, 5);
    }
    
    setter(cleaned);
  };

  // Función para formatear con ceros a la izquierda al perder el foco
  const handleDateBlur = (value: string, setter: (val: string) => void) => {
    if (!value || !value.includes('/')) return;
    
    const parts = value.split('/');
    if (parts.length !== 2) return;
    
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    
    // Solo formatear si ambas partes son números válidos
    if (!isNaN(parseInt(day)) && !isNaN(parseInt(month))) {
      const formatted = `${day}/${month}`;
      setter(formatted);
    }
  };

  // Función para manejar Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApplyCustomPeriod();
    }
  };

  const handleApplyCustomPeriod = () => {
    // Verificar que ambas fechas sean válidas
    if (!isStartDateValid || !isEndDateValid) {
      alert("Por favor ingrese fechas válidas en formato DD/MM");
      return;
    }

    // Parse DD/MM format
    const startParts = startDate.split('/');
    const endParts = endDate.split('/');

    if (startParts.length !== 2 || endParts.length !== 2) {
      alert("Por favor use el formato DD/MM (ejemplo: 15/03)");
      return;
    }

    const startDayNum = parseInt(startParts[0]);
    const startMonthNum = parseInt(startParts[1]);
    const endDayNum = parseInt(endParts[0]);
    const endMonthNum = parseInt(endParts[1]);

    if (
      !startDate || !endDate ||
      isNaN(startDayNum) || isNaN(startMonthNum) || isNaN(endDayNum) || isNaN(endMonthNum)
    ) {
      alert("Por favor ingrese valores válidos en formato DD/MM");
      return;
    }

    try {
      const currentYear = new Date().getFullYear();
      const startDateObj = new Date(currentYear, startMonthNum - 1, startDayNum);
      const endDateObj = new Date(currentYear, endMonthNum - 1, endDayNum);

      if (startDateObj > endDateObj) {
        alert("La fecha de inicio debe ser anterior a la fecha de fin.");
        return;
      }

      // Set custom range
      setRangeType("custom" as any);
      setAnchorDate(startDateObj);
      
      // Store custom end date in localStorage for timeline to use
      localStorage.setItem("customEndDate", endDateObj.toISOString());
      
    } catch (error) {
      alert("Error al procesar las fechas. Verifique los valores ingresados.");
    }
  };

  return (
    <div className="w-full space-y-2">
      {/* Fila superior con labels */}
      <div className="flex items-center gap-4 text-xs font-medium">
        <span className={`flex-1 ${!isStartDateValid ? 'text-red-500' : 'text-muted-foreground'}`}>
          Desde:
        </span>
        <span className={`flex-1 ${!isEndDateValid ? 'text-red-500' : 'text-muted-foreground'}`}>
          Hasta:
        </span>
        <span className="w-16"></span> {/* Espacio para alinear con el botón */}
      </div>
      
      {/* Fila inferior con campos y botón */}
      <div className="flex items-center gap-2">
        {/* Campo Desde */}
        <Input
          type="text"
          placeholder="DD/MM"
          value={startDate}
          onChange={(e) => handleDateInput(e.target.value, setStartDate)}
          onBlur={(e) => handleDateBlur(e.target.value, setStartDate)}
          onKeyPress={handleKeyPress}
          className={`text-xs h-7 flex-1 ${
            !isStartDateValid ? 'border-red-500 text-red-500 focus:border-red-500 focus:ring-red-500' : ''
          }`}
          maxLength={5}
        />
        
        {/* Campo Hasta */}
        <Input
          type="text"
          placeholder="DD/MM"
          value={endDate}
          onChange={(e) => handleDateInput(e.target.value, setEndDate)}
          onBlur={(e) => handleDateBlur(e.target.value, setEndDate)}
          onKeyPress={handleKeyPress}
          className={`text-xs h-7 flex-1 ${
            !isEndDateValid ? 'border-red-500 text-red-500 focus:border-red-500 focus:ring-red-500' : ''
          }`}
          maxLength={5}
        />
        
        {/* Botón Aplicar */}
        <Button 
          onClick={handleApplyCustomPeriod}
          size="sm" 
          className="h-7 text-xs px-3 w-16"
        >
          Aplicar
        </Button>
      </div>
    </div>
  );
}
