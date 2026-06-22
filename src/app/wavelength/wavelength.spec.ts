import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WavelengthComponent } from './wavelength';

describe('Wavelength', () => {
  let component: WavelengthComponent;
  let fixture: ComponentFixture<WavelengthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WavelengthComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WavelengthComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
