import type  { ChatData, User, Chat, Message } from '../Notes/type';

const users: User[] = [
  {
    id: '1',
    name: 'Ana García',
    email: 'ana.garcia@email.com',
    isOnline: true,
  },
  {
    id: '2',
    name: 'Carlos López',
    email: 'carlos.lopez@email.com',
    isOnline: false,
    lastSeen: 'Hace 2 horas',
  },
  {
    id: '3',
    name: 'María Rodríguez',
    email: 'maria.rodriguez@email.com',
    isOnline: true,
  },
  {
    id: '4',
    name: 'Diego Fernández',
    email: 'diego.fernandez@email.com',
    isOnline: false,
    lastSeen: 'Ayer',
  },
];

const messages: Message[] = [
  // Chat 1 - Proyecto React con Ana
  {
    id: '1',
    content: '¡Hola! ¿Cómo va el desarrollo del componente de autenticación?',
    senderId: '1',
    timestamp: new Date('2024-01-15T10:00:00'),
    isRead: true,
  },
  {
    id: '2',
    content: 'Va muy bien, ya tengo la validación de formularios funcionando. ¿Has revisado el PR que envié?',
    senderId: 'current',
    timestamp: new Date('2024-01-15T10:15:00'),
    isRead: true,
  },
  {
    id: '3',
    content: 'Sí, lo revisé ayer. Está excelente, solo tengo algunas sugerencias menores sobre los estilos.',
    senderId: '1',
    timestamp: new Date('2024-01-15T11:00:00'),
    isRead: false,
  },
  // Chat 2 - Diseño UI/UX con Ana
  {
    id: '4',
    content: 'He creado los mockups para la nueva landing page. ¿Podrías revisarlos?',
    senderId: '1',
    timestamp: new Date('2024-01-14T15:30:00'),
    isRead: true,
  },
  {
    id: '5',
    content: 'Claro, los reviso ahora. ¿Los subiste a Figma?',
    senderId: 'current',
    timestamp: new Date('2024-01-14T15:45:00'),
    isRead: true,
  },
  {
    id: '6',
    content: 'Sí, ya están en el proyecto principal. Me encanta cómo quedó la sección hero.',
    senderId: '1',
    timestamp: new Date('2024-01-14T16:00:00'),
    isRead: true,
  },
  // Chat 3 - Marketing Digital con Carlos
  {
    id: '7',
    content: 'Las métricas de la campaña de Google Ads están mejorando significativamente.',
    senderId: '2',
    timestamp: new Date('2024-01-13T09:00:00'),
    isRead: true,
  },
  {
    id: '8',
    content: '¡Excelente! ¿Cuál es el CTR actual?',
    senderId: 'current',
    timestamp: new Date('2024-01-13T09:15:00'),
    isRead: true,
  },
  {
    id: '9',
    content: 'Subió a 3.2%, un aumento del 40% respecto al mes pasado.',
    senderId: '2',
    timestamp: new Date('2024-01-13T09:30:00'),
    isRead: false,
  },
  // Chat 4 - Estrategia SEO con Carlos
  {
    id: '10',
    content: 'Necesitamos optimizar las páginas principales para las nuevas keywords.',
    senderId: '2',
    timestamp: new Date('2024-01-12T14:00:00'),
    isRead: true,
  },
  {
    id: '11',
    content: 'Perfecto, ¿ya tienes la lista de keywords prioritarias?',
    senderId: 'current',
    timestamp: new Date('2024-01-12T14:15:00'),
    isRead: true,
  },
];

const chats: Chat[] = [
  {
    id: '1',
    title: 'Proyecto React',
    description: 'Desarrollo del sistema de autenticación',
    participants: ['1', 'current'],
    messages: messages.slice(0, 3),
    createdAt: new Date('2024-01-10T08:00:00'),
    updatedAt: new Date('2024-01-15T11:00:00'),
    unreadCount: 1,
  },
  {
    id: '2',
    title: 'Diseño UI/UX',
    description: 'Mockups y prototipos de la nueva landing',
    participants: ['1', 'current'],
    messages: messages.slice(3, 6),
    createdAt: new Date('2024-01-08T10:00:00'),
    updatedAt: new Date('2024-01-14T16:00:00'),
    unreadCount: 0,
  },
  {
    id: '3',
    title: 'Marketing Digital',
    description: 'Campañas publicitarias y análisis',
    participants: ['2', 'current'],
    messages: messages.slice(6, 9),
    createdAt: new Date('2024-01-05T09:00:00'),
    updatedAt: new Date('2024-01-13T09:30:00'),
    unreadCount: 1,
  },
  {
    id: '4',
    title: 'Estrategia SEO',
    description: 'Optimización y posicionamiento web',
    participants: ['2', 'current'],
    messages: messages.slice(9, 11),
    createdAt: new Date('2024-01-03T12:00:00'),
    updatedAt: new Date('2024-01-12T14:15:00'),
    unreadCount: 0,
  },
  {
    id: '5',
    title: 'Análisis de Datos',
    description: 'Métricas y reportes de performance',
    participants: ['3', 'current'],
    messages: [],
    createdAt: new Date('2024-01-01T10:00:00'),
    updatedAt: new Date('2024-01-01T10:00:00'),
    unreadCount: 0,
  },
  {
    id: '6',
    title: 'Desarrollo Backend',
    description: 'APIs y arquitectura del servidor',
    participants: ['4', 'current'],
    messages: [],
    createdAt: new Date('2023-12-28T15:00:00'),
    updatedAt: new Date('2023-12-28T15:00:00'),
    unreadCount: 0,
  },
];

export const mockData: ChatData = {
  users,
  chats,
};