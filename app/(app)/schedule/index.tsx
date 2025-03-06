import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Calendar, Clock, MapPin, Car } from 'lucide-react-native';
import { useAuth } from '../../../context/auth';

const serviceTypes = [
  { id: '1', name: 'Full Detail', duration: '3 hours', price: 199.99 },
  { id: '2', name: 'Express Wash', duration: '1 hour', price: 49.99 },
  { id: '3', name: 'Interior Clean', duration: '2 hours', price: 149.99 },
];

const timeSlots = [
  '9:00 AM', '10:00 AM', '11:00 AM',
  '1:00 PM', '2:00 PM', '3:00 PM',
];

const mockSchedule = [
  {
    id: '1',
    time: '9:00 AM',
    service: 'Full Detail',
    client: 'Tesla Motors',
    vehicle: 'Model 3',
    location: 'Bay 1',
    duration: '3 hours',
  },
  {
    id: '2',
    time: '1:00 PM',
    service: 'Express Wash',
    client: 'BMW Dealership',
    vehicle: 'X5',
    location: 'Bay 2',
    duration: '1 hour',
  },
  {
    id: '3',
    time: '3:00 PM',
    service: 'Interior Clean',
    client: 'Mercedes-Benz',
    vehicle: 'C-Class',
    location: 'Bay 3',
    duration: '2 hours',
  },
];

function EmployeeSchedule() {
  return (
    <ScrollView style={styles.container}>
      {/* Employee schedule implementation */}
      <View style={styles.scheduleList}>
        {mockSchedule.map((appointment) => (
          <View key={appointment.id} style={styles.appointmentCard}>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{appointment.time}</Text>
              <Text style={styles.durationText}>{appointment.duration}</Text>
            </View>
            <View style={styles.appointmentDetails}>
              <Text style={styles.serviceName}>{appointment.service}</Text>
              <View style={styles.detailRow}>
                <Car size={16} color="#666" />
                <Text style={styles.detailText}>{appointment.client} - {appointment.vehicle}</Text>
              </View>
              <View style={styles.detailRow}>
                <MapPin size={16} color="#666" />
                <Text style={styles.detailText}>{appointment.location}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function Schedule() {
  const { user } = useAuth();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState('');

  const handleSchedule = () => {
    // TODO: Implement scheduling logic
    console.log({
      service: selectedService,
      date: selectedDate,
      time: selectedTime,
      vehicleDetails,
    });
  };

  if (user?.role === 'employee') {
    return <EmployeeSchedule />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Service</Text>
        <View style={styles.serviceList}>
          {serviceTypes.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceCard,
                selectedService === service.id && styles.serviceCardSelected,
              ]}
              onPress={() => setSelectedService(service.id)}
            >
              <View style={styles.serviceHeader}>
                <Car size={20} color={selectedService === service.id ? '#fff' : '#007AFF'} />
                <Text style={[
                  styles.serviceName,
                  selectedService === service.id && styles.serviceTextSelected,
                ]}>
                  {service.name}
                </Text>
              </View>
              <View style={styles.serviceDetails}>
                <View style={styles.serviceDetail}>
                  <Clock size={16} color={selectedService === service.id ? '#fff' : '#666'} />
                  <Text style={[
                    styles.serviceDetailText,
                    selectedService === service.id && styles.serviceTextSelected,
                  ]}>
                    {service.duration}
                  </Text>
                </View>
                <Text style={[
                  styles.servicePrice,
                  selectedService === service.id && styles.serviceTextSelected,
                ]}>
                  ${service.price}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter vehicle make, model, and year"
          value={vehicleDetails}
          onChangeText={setVehicleDetails}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Time</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.timeSlotContainer}
        >
          {timeSlots.map((time) => (
            <TouchableOpacity
              key={time}
              style={[
                styles.timeSlot,
                selectedTime === time && styles.timeSlotSelected,
              ]}
              onPress={() => setSelectedTime(time)}
            >
              <Text style={[
                styles.timeSlotText,
                selectedTime === time && styles.timeSlotTextSelected,
              ]}>
                {time}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity
        style={[
          styles.scheduleButton,
          (!selectedService || !selectedTime || !vehicleDetails) && styles.scheduleButtonDisabled,
        ]}
        onPress={handleSchedule}
        disabled={!selectedService || !selectedTime || !vehicleDetails}
      >
        <Text style={styles.scheduleButtonText}>Schedule Service</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  serviceList: {
    gap: 10,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  serviceCardSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceDetailText: {
    color: '#666',
    fontSize: 14,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  serviceTextSelected: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  timeSlotContainer: {
    flexDirection: 'row',
  },
  timeSlot: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  timeSlotSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#000',
  },
  timeSlotTextSelected: {
    color: '#fff',
  },
  scheduleButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scheduleButtonDisabled: {
    backgroundColor: '#ccc',
  },
  scheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scheduleList: {
    padding: 20,
    gap: 15,
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  timeContainer: {
    alignItems: 'center',
    minWidth: 80,
    borderRightWidth: 1,
    borderRightColor: '#eee',
    paddingRight: 16,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  durationText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  appointmentDetails: {
    flex: 1,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});