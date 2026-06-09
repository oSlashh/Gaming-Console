import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReactionTimeGameComponent } from './reaction-time';

describe('ReactionTime', () => {
  let component: ReactionTimeGameComponent;
  let fixture: ComponentFixture<ReactionTimeGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactionTimeGameComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ReactionTimeGameComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
