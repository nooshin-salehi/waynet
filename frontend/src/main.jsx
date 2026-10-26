import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, Guard, NotFound, ScrollManager } from './components';
import { Home } from './Home';
import { Courses, Category, Search, Course, Lesson, Career, Instructor, Services, ServiceDetail, ShopRedirect, RackRedirect, Contact, About, Cart } from './PublicPages';
import { Auth, ForgotPassword, Dashboard, DashboardCourses, Orders, Profile } from './AccountPages';
import * as M from './Management';
import { Teacher, TeacherCourses, CourseForm, CourseManagement, TeacherAnnouncements, TeacherQuestions } from './TeacherPages';
import './style.css';

const admin = el => <Guard roles={['admin']}>{el}</Guard>;
const teacher = el => <Guard roles={['teacher', 'admin']}>{el}</Guard>;
const user = el => <Guard>{el}</Guard>;
function App() {
  return <Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/courses" element={<Courses/>}/><Route path="/courses/:category" element={<Category/>}/><Route path="/search" element={<Search/>}/>
    <Route path="/course/:id" element={<Course/>}/><Route path="/course/:id/session/:sessionId" element={<Lesson/>}/>
    <Route path="/career/:id" element={<Career/>}/><Route path="/instructors/:id" element={<Instructor/>}/>
    <Route path="/services" element={<Services/>}/><Route path="/services/:id" element={<ServiceDetail/>}/>
    <Route path="/shop" element={<ShopRedirect/>}/><Route path="/rack-rental" element={<RackRedirect/>}/><Route path="/racks" element={<RackRedirect/>}/>
    <Route path="/contact" element={<Contact/>}/><Route path="/about" element={<About/>}/><Route path="/cart" element={<Cart/>}/>
    <Route path="/auth" element={<Navigate to="/login" replace/>}/><Route path="/login" element={<Auth/>}/><Route path="/register" element={<Auth/>}/>
    <Route path="/forgot-password" element={<ForgotPassword/>}/><Route path="/reset-password/:uid/:token" element={<Navigate to="/forgot-password" replace/>}/>
    <Route path="/dashboard" element={user(<Dashboard/>)}/><Route path="/dashboard/courses" element={user(<DashboardCourses/>)}/><Route path="/dashboard/orders" element={user(<Orders/>)}/><Route path="/dashboard/profile" element={user(<Profile/>)}/>

    <Route path="/teacher" element={teacher(<Teacher/>)}/><Route path="/teacher/courses" element={teacher(<TeacherCourses/>)}/>
    <Route path="/teacher/courses/create" element={teacher(<CourseForm mode="create"/>)}/>
    <Route path="/teacher/courses/:id" element={teacher(<CourseManagement/>)}/><Route path="/teacher/courses/:id/edit" element={teacher(<CourseForm mode="edit"/>)}/>
    <Route path="/teacher/announcements" element={teacher(<TeacherAnnouncements/>)}/><Route path="/teacher/questions" element={teacher(<TeacherQuestions/>)}/>

    <Route path="/admin" element={admin(<M.Admin/>)}/>
    <Route path="/admin/users" element={admin(<M.AdminUsers/>)}/><Route path="/admin/users/:phone" element={admin(<M.AdminUserDetail/>)}/>
    <Route path="/admin/teachers" element={admin(<M.AdminTeachers/>)}/><Route path="/admin/teachers/:id/edit" element={admin(<M.AdminTeacherEdit/>)}/>
    <Route path="/admin/students" element={admin(<M.AdminStudents/>)}/>
    <Route path="/admin/courses" element={admin(<M.AdminCourses/>)}/><Route path="/admin/courses/create" element={admin(<M.AdminCourseForm mode="create"/>)}/>
    <Route path="/admin/courses/:id" element={admin(<M.AdminCourseDetail/>)}/><Route path="/admin/courses/:id/edit" element={admin(<M.AdminCourseForm mode="edit"/>)}/>
    <Route path="/admin/categories" element={admin(<M.AdminCategories/>)}/>
    <Route path="/admin/orders" element={admin(<M.AdminOrders/>)}/><Route path="/admin/payments" element={admin(<M.AdminPayments/>)}/>
    <Route path="/admin/services" element={admin(<M.CatalogList kind="service"/>)}/><Route path="/admin/services/create" element={admin(<M.CatalogForm kind="service" mode="create"/>)}/><Route path="/admin/services/:id/edit" element={admin(<M.CatalogForm kind="service" mode="edit"/>)}/>
    <Route path="/admin/products" element={admin(<M.CatalogList kind="product"/>)}/><Route path="/admin/products/create" element={admin(<M.CatalogForm kind="product" mode="create"/>)}/><Route path="/admin/products/:id/edit" element={admin(<M.CatalogForm kind="product" mode="edit"/>)}/>
    <Route path="/admin/racks" element={admin(<M.CatalogList kind="rack"/>)}/><Route path="/admin/racks/create" element={admin(<M.CatalogForm kind="rack" mode="create"/>)}/><Route path="/admin/racks/:id/edit" element={admin(<M.CatalogForm kind="rack" mode="edit"/>)}/>
    <Route path="/admin/rack-requests" element={admin(<M.AdminRackRequests/>)}/><Route path="/admin/testimonials" element={admin(<M.AdminTestimonials/>)}/>
    <Route path="*" element={<NotFound/>}/>
  </Routes>;
}
createRoot(document.getElementById('root')).render(<BrowserRouter><AuthProvider><ScrollManager/><App/></AuthProvider></BrowserRouter>);
