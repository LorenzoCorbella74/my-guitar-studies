import { trigger, transition, style, animate, query, stagger, AnimationTriggerMetadata } from '@angular/animations';

/**
 * Simple fade in animation for elements entering the DOM
 * Duration: 200ms
 */
export const fadeIn: AnimationTriggerMetadata = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('200ms ease-out', style({ opacity: 1 }))
  ])
]);

/**
 * Fade out animation for elements leaving the DOM
 * Duration: 150ms
 */
export const fadeOut: AnimationTriggerMetadata = trigger('fadeOut', [
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0 }))
  ])
]);

/**
 * Combined fade in and fade out animation
 * Duration: 200ms in, 150ms out
 */
export const fade: AnimationTriggerMetadata = trigger('fade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('200ms ease-out', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0 }))
  ])
]);

/**
 * Slide in from right with fade (useful for toasts)
 * Duration: 250ms
 */
export const slideInRight: AnimationTriggerMetadata = trigger('slideInRight', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(100%)' }),
    animate('250ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateX(0)' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))
  ])
]);

/**
 * Fade with slide up animation
 * Duration: 300ms
 */
export const fadeSlideUp: AnimationTriggerMetadata = trigger('fadeSlideUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(10px)' }),
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
  ])
]);

/**
 * Scale in animation (useful for modals and dropdowns)
 * Duration: 200ms in, 150ms out
 */
export const scaleIn: AnimationTriggerMetadata = trigger('scaleIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.95)' }),
    animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'scale(1)' }))
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
  ])
]);

/**
 * Stagger animation for lists - animates children one by one
 * Delay between items: 50ms
 * Duration: 300ms per item
 * 
 * Usage: Add [@listStagger] to parent container
 */
export const listStagger: AnimationTriggerMetadata = trigger('listStagger', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(-10px)' }),
      stagger(50, [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ], { optional: true })
  ])
]);

/**
 * Height expand/collapse animation with fade
 * Duration: 250ms
 */
export const expandCollapse: AnimationTriggerMetadata = trigger('expandCollapse', [
  transition(':enter', [
    style({ height: 0, opacity: 0, overflow: 'hidden' }),
    animate('250ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: '*', opacity: 1 }))
  ]),
  transition(':leave', [
    style({ overflow: 'hidden' }),
    animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: 0, opacity: 0 }))
  ])
]);

/**
 * Route transition animations
 * Simple fade cross-fade between pages
 */
export const routeFade: AnimationTriggerMetadata = trigger('routeFade', [
  transition('* <=> *', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        width: '100%'
      })
    ], { optional: true }),
    query(':enter', [
      style({ opacity: 0 })
    ], { optional: true }),
    query(':leave', [
      animate('150ms ease-out', style({ opacity: 0 }))
    ], { optional: true }),
    query(':enter', [
      animate('200ms 150ms ease-in', style({ opacity: 1 }))
    ], { optional: true })
  ])
]);

/**
 * Pulse animation (useful for beat indicators)
 * Can be triggered programmatically
 */
export const pulse: AnimationTriggerMetadata = trigger('pulse', [
  transition('* => pulse', [
    style({ transform: 'scale(1)' }),
    animate('100ms ease-out', style({ transform: 'scale(1.15)', opacity: 0.9 })),
    animate('100ms ease-in', style({ transform: 'scale(1)', opacity: 1 }))
  ])
]);
