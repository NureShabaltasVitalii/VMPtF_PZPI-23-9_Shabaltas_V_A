# -*- coding: utf-8 -*-

import json
import urllib.request


def create_default_students():
    students = []

    students.append([
        "Іваненко Іван Іванович",
        "КН-11",
        "photos/ivanenko.jpg",
        "ivanenko@example.com, +380501112233",
        [["Математика", "10"], ["Історія", "9"], ["Англійська мова", "11"]]
    ])

    students.append([
        "Петренко Олена Сергіївна",
        "КН-12",
        "photos/petrenko.jpg",
        "petrenko@example.com, +380672224455",
        [["Математика", "12"], ["Історія", "10"], ["Англійська мова", "9"]]
    ])

    students.append([
        "Сидоренко Максим Андрійович",
        "КН-11",
        "photos/sydorenko.jpg",
        "sydorenko@example.com, +380933336677",
        [["Математика", "8"], ["Історія", "11"], ["Англійська мова", "10"]]
    ])

    return students


def get_all_subjects(students):
    subjects = []

    for student in students:
        grades = student[4]

        for grade in grades:
            subject = grade[0]

            if subject not in subjects:
                subjects.append(subject)

    return subjects


def get_grade_by_subject(student, subject):
    grades = student[4]

    for grade in grades:
        if grade[0] == subject:
            return grade[1]

    return "-"


def choose_subjects(students):
    subjects = get_all_subjects(students)

    if len(subjects) == 0:
        return []

    print("\nДоступні предмети:")
    for subject in subjects:
        print("-", subject)

    print("\nВведіть потрібні предмети через кому.")
    print("Якщо хочете показати всі предмети, просто натисніть Enter.")

    user_input = input("Предмети: ")

    if user_input == "":
        return subjects

    selected_subjects = []
    parts = user_input.split(",")

    for part in parts:
        subject = part.strip()

        if subject != "":
            selected_subjects.append(subject)

    return selected_subjects


def show_students(students):
    if len(students) == 0:
        print("\nСписок студентів порожній.")
        return

    selected_subjects = choose_subjects(students)

    print("\nСписок студентів:")
    print("-" * 60)

    for student in students:
        pib = student[0]
        group = student[1]
        photo = student[2]
        contact = student[3]

        print("ПІБ:", pib)
        print("Група:", group)
        print("Фото:", photo)
        print("Контактна інформація:", contact)
        print("Оцінки:")

        for subject in selected_subjects:
            mark = get_grade_by_subject(student, subject)
            print(" ", subject + ":", mark)

        print("-" * 60)


def add_student(students):
    print("\nДодавання нового студента")

    pib = input("ПІБ: ")
    group = input("Група: ")
    photo = input("Фото (назва файла або посилання): ")
    contact = input("Контактна інформація: ")

    grades = []

    print("\nВведіть оцінки з предметів.")
    print("Щоб завершити введення, залиште назву предмета порожньою.")

    while True:
        subject = input("Предмет: ")

        if subject == "":
            break

        mark = input("Оцінка: ")
        grades.append([subject, mark])

    student = [pib, group, photo, contact, grades]
    students.append(student)

    print("\nСтудента додано.")


def import_from_csv(file_name):
    students = []

    try:
        file = open(file_name, "r", encoding="utf-8")
        lines = file.readlines()
        file.close()
    except:
        print("\nНе вдалося відкрити CSV-файл.")
        return students

    if len(lines) < 2:
        print("\nCSV-файл не містить даних про студентів.")
        return students

    headers = lines[0].strip().split(",")

    for i in range(1, len(lines)):
        line = lines[i].strip()

        if line == "":
            continue

        parts = line.split(",")

        if len(parts) < 5:
            continue

        pib = parts[0]
        group = parts[1]
        photo = parts[2]
        contact = parts[3]
        grades = []

        for j in range(4, len(headers)):
            subject = headers[j]

            if j < len(parts):
                mark = parts[j]
            else:
                mark = "-"

            grades.append([subject, mark])

        students.append([pib, group, photo, contact, grades])

    return students


def import_from_api(url):
    students = []

    try:
        if url.startswith("http://") or url.startswith("https://") or url.startswith("file:///"):
            response = urllib.request.urlopen(url)
            data = response.read().decode("utf-8")
        else:
            file = open(url, "r", encoding="utf-8")
            data = file.read()
            file.close()

        api_students = json.loads(data)
    except:
        print("\nНе вдалося отримати або прочитати дані з API або JSON-файла.")
        return students

    for item in api_students:
        pib = item.get("pib", "")
        group = item.get("group", "")
        photo = item.get("photo", "")
        contact = item.get("contact", "")
        grades_data = item.get("grades", {})
        grades = []

        for subject in grades_data:
            grades.append([subject, str(grades_data[subject])])

        students.append([pib, group, photo, contact, grades])

    return students


def show_menu():
    print("\nМеню")
    print("1 - Показати список студентів")
    print("2 - Додати студента")
    print("3 - Імпортувати студентів з CSV-файла")
    print("4 - Імпортувати студентів з API")
    print("0 - Вийти")


def main():
    students = create_default_students()

    while True:
        show_menu()
        choice = input("Ваш вибір: ")

        if choice == "1":
            show_students(students)
        elif choice == "2":
            add_student(students)
        elif choice == "3":
            file_name = input("Введіть назву CSV-файла: ")
            new_students = import_from_csv(file_name)

            if len(new_students) > 0:
                students = new_students
                print("\nДані з CSV успішно імпортовано.")
        elif choice == "4":
            url = input("Введіть адресу API або назву JSON-файла: ")
            new_students = import_from_api(url)

            if len(new_students) > 0:
                students = new_students
                print("\nДані з API успішно імпортовано.")
        elif choice == "0":
            print("\nРоботу програми завершено.")
            break
        else:
            print("\nНеправильний вибір. Спробуйте ще раз.")


main()
