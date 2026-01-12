/**
 * Event Bus - Main export
 *
 * To swap to Azure Service Bus later:
 * 1. Create servicebus-event-bus.ts implementing IEventBus
 * 2. Change the import below to: import { eventBus } from "./servicebus-event-bus";
 */

// Current implementation: RabbitMQ
export { eventBus } from "./event-bus";

// Re-export types and constants
export {
	IEventBus,
	EventHandler,
	Events,
	EventName,
} from "./event-bus.interface";
